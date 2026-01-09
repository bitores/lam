import axios from 'axios'
import JSZip, { loadAsync } from 'jszip'
import * as THREE from 'three'
import urlParse from 'url-parse'
import NProgress from 'nprogress';
import './nprogress/nprogress.css'; 
import {
  IAnimationConfig,
  IMotionConfig,
  TYVoiceChatState
} from './interface'
import { AnimationManager } from './state'
import { Viewer } from './Viewer'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { SceneFormat } from './loaders/SceneFormat.js'
import {motionConfig, animationConfig, charactorConfig} from './config.js'

export class GaussianSplatRenderer {
  static async getInstance(container: HTMLDivElement, assetPath: string, 
    options?: { getChatState?: Function, getExpressionData?: Function, loadProgress?: Function, downloadProgress?: Function, backgroundColor?: string}): Promise<GaussianSplatRenderer | undefined> {
    if (this.instance != undefined) {
      return this.instance
    }
    try {
      const characterPath = assetPath;
      const { pathname } = urlParse(characterPath)
      const matches = pathname.match(/\/([^/]+?)\.zip/)
      const characterName = matches && matches[1]
      if (!characterName) {
        throw new Error('character model is not found')
      }
        
          NProgress.start();

          const characterZipResponse = await axios.get(characterPath, {
              responseType: 'arraybuffer',
              timeout: 100000,
              onDownloadProgress: (progressEvent) => {
                if (progressEvent.lengthComputable && progressEvent && progressEvent.total) {
                  const percent = (progressEvent.loaded / progressEvent.total);
                  // console.log(`Downloaded ${percent * 100.0}%`);
                  NProgress.set(percent)
                  options?.downloadProgress && options?.downloadProgress(percent)
                }
              }
          });
          options?.loadProgress && options?.loadProgress(0.1)
          NProgress.done();
          console.log('download completed:', characterZipResponse.data);

      const arrayBuffer = characterZipResponse.data
      const zipData = await loadAsync(arrayBuffer)
      let fileName = ''
      Object.values(zipData.files).forEach(file => {
        if (file.dir) {
          fileName = file.name?.slice(0, file.name?.length - 1) // 去掉末尾的‘/’
        }
      })
      if (!fileName) {
        throw new Error('file fold is not found')
      }
      const renderer = new GaussianSplatRenderer(container, zipData)
      const cameraPos = new THREE.Vector3()
      cameraPos.x = charactorConfig.camPos?.x || 0
      cameraPos.y = charactorConfig.camPos?.y || 0
      cameraPos.z = charactorConfig.camPos?.z || 1

      const cameraRotation = new THREE.Vector3()
      cameraRotation.x = charactorConfig.camRot?.x || 0
      cameraRotation.y = charactorConfig.camRot?.y || 0
      cameraRotation.z = charactorConfig.camRot?.z || 0

      let backgroundColor = 0xffffff
      if (charactorConfig.backgroundColor) {
        backgroundColor = parseInt(charactorConfig.backgroundColor, 16)
      }
      if(options && options.backgroundColor && renderer.isHexColorStrict(options.backgroundColor)) {
        backgroundColor = parseInt(options.backgroundColor, 16)
      }

      renderer.getChatState = options?.getChatState
      renderer.getExpressionData = options?.getExpressionData
      if (charactorConfig.useFlame) {
        renderer.useFlame = (charactorConfig.useFlame == "false")? false : true;
      }
      

      console.log(cameraPos, backgroundColor)
      renderer.viewer = new Viewer({
        rootElement: container,
        threejsCanvas: GaussianSplatRenderer._canvas,
        cameraUp: [0, 1, 0],
        initialCameraPosition: [cameraPos.x, cameraPos.y, cameraPos.z],
        initialCameraRotation: [cameraRotation.x, cameraRotation.y, cameraRotation.z],
        sphericalHarmonicsDegree: 0,
        backgroundColor: backgroundColor
      })
      renderer.viewer.useFlame = renderer.useFlame
      if (renderer.viewer.useFlame == true) {
        await renderer.loadFlameModel(
          fileName,
          motionConfig
        )
      } else {
        await renderer.loadModel(
          fileName,
          animationConfig,
          motionConfig
        )
      }
      options?.loadProgress && options?.loadProgress(0.2)

      const offsetFileUrl = await renderer.unpackFileAsBlob(
        fileName + '/offset.ply'
      )
      options?.loadProgress && options?.loadProgress(0.3)
      renderer.viewer
        .addSplatScene(offsetFileUrl!, {
          progressiveLoad: true,
          sharedMemoryForWorkers: false,
          showLoadingUI: false,
          format: SceneFormat.Ply
        })
        .then(() => {
          renderer.render()
          options?.loadProgress && options?.loadProgress(1)
        })

      return renderer
    } 
    catch (error) {
      console.error(error)
    }
  }
  public zipUrls: {
    urls: Map<string, string>
    zip?: JSZip
  } = {
    urls: new Map<string, string>()
  }
  static instance: GaussianSplatRenderer | undefined

  private viewer: Viewer | undefined
  private useFlame: boolean = false;
  private background: THREE.Group | undefined
  private model: THREE.Group | undefined
  private mixer: THREE.AnimationMixer | undefined

  private lastTime = 0;
  private startTime = 0;
  private animManager: AnimationManager | undefined
  private expressionData: Record<string, number> = {}
  private chatState: TYVoiceChatState = TYVoiceChatState.Idle
  private getExpressionData: Function | undefined
  private getChatState: Function | undefined

  // private _ee: LocalAvatar | PureAvatar
  private motioncfg: IMotionConfig | undefined
  private clock: THREE.Clock

  static _canvas: HTMLCanvasElement = document.createElement('canvas')

  constructor(
    _container: HTMLDivElement,
    zipData: JSZip
  ) {
    Object.assign(this.zipUrls, {
      zip: zipData
    })
    const { width, height } = _container.getBoundingClientRect()
    GaussianSplatRenderer._canvas.style.visibility = 'visible'
    GaussianSplatRenderer._canvas.width = width
    GaussianSplatRenderer._canvas.height = height
    _container.appendChild(GaussianSplatRenderer._canvas)

    this.clock = new THREE.Clock();
    this.startTime = performance.now() / 1000.0;
  }

  public dispose(): void {
    GaussianSplatRenderer._canvas.style.visibility = 'hidden'
    this.disposeModel()
    this.zipUrls.urls.forEach((value) => {
      URL.revokeObjectURL(value)
    })
  }

  public disposeModel() {
    if (this.mixer) {
      this.mixer.stopAllAction()
      if(this.viewer && this.viewer.avatarMesh) {
        this.mixer.uncacheRoot(this.viewer.avatarMesh)
      }
      this.mixer = undefined
      this.animManager?.dispose()
    }
    this.viewer?.dispose()
  }
  public getCamera(): THREE.Camera | undefined {
    return this.viewer?.camera
  }
  updateBS(actionData: Record<string, number>): Record<string, number> {
    let influence: Record<string, number> = {
      browDownLeft: 0.0,
      browDownRight: 0.0,
      browInnerUp: 0.0,
      browOuterUpLeft: 0.0,
      browOuterUpRight: 0.0,
      mouthCheekPuff: 0.0,
      cheekSquintLeft: 0.0,
      cheekSquintRight: 0.0,
      eyeBlinkLeft: 0.0,
      eyeBlinkRight: 0.0,
      eyeLookDownLeft: 0.0,
      eyeLookDownRight: 0.0,
      eyeLookInLeft: 0.0,
      eyeLookInRight: 0.0,
      eyeLookOutLeft: 0.0,
      eyeLookOutRight: 0.0,
      eyeLookUpLeft: 0.0,
      eyeLookUpRight: 0.0,
      eyeSquintLeft: 0.0,
      eyeSquintRight: 0.0,
      eyeWideLeft: 0.0,
      eyeWideRight: 0.0,
      jawForward: 0.0,
      jawLeft: 0.0,
      jawOpen: 0.0,
      jawRight: 0.0,
      mouthClose: 0.0,
      mouthDimpleLeft: 0.0,
      mouthDimpleRight: 0.0,
      mouthFrownLeft: 0.0,
      mouthFrownRight: 0.0,
      mouthFunnel: 0.0,
      mouthLeft: 0.0,
      mouthLowerDownLeft: 0.0,
      mouthLowerDownRight: 0.0,
      mouthPressLeft: 0.0,
      mouthPressRight: 0.0,
      mouthPucker: 0.0,
      mouthRight: 0.0,
      mouthRollLower: 0.0,
      mouthRollUpper: 0.0,
      mouthShrugLower: 0.0,
      mouthShrugUpper: 0.0,
      mouthSmileLeft: 0.0,
      mouthSmileRight: 0.0,
      mouthStretchLeft: 0.0,
      mouthStretchRight: 0.0,
      mouthUpperUpLeft: 0.0,
      mouthUpperUpRight: 0.0,
      noseSneerLeft: 0.0,
      noseSneerRight: 0.0,
      tongueOut: 0.0
    }

    if (actionData != null) {
      influence = actionData
    }
    return influence
  }
  public render() {
    if (this.viewer && this.viewer.selfDrivenMode) {
      if (this.viewer.webXRMode) {
        this.viewer.renderer.setAnimationLoop(this.viewer.selfDrivenUpdateFunc)
      } else {
        this.viewer.requestFrameId = requestAnimationFrame(() => this.render())

        const frameInfoInternal = 1.0 / 30.0;
        const currentTime = performance.now() / 1000;
        const calcDelta = (currentTime - this.startTime)%(this.viewer.totalFrames * frameInfoInternal);
        const frameIndex = Math.floor(calcDelta / frameInfoInternal)
        this.viewer.frame = frameIndex;

        if (this.getChatState) {
          this.chatState = this.getChatState()
          this.animManager?.update(this.chatState)
        }

        if (this.getExpressionData) {
          this.expressionData = this.updateBS(
            this.getExpressionData() as Record<string, number>
          )
        }

        if(this.viewer.useFlame == false) {
          if (!this.mixer || !this.animManager) return
          const mixerUpdateDelta = this.clock.getDelta()
          this.mixer.update(mixerUpdateDelta)
         
  
          // apply motion config
          if (this.motioncfg) {
            for (const morphTarget in this.expressionData) {
              const offset = this.motioncfg!.offset[morphTarget]
              const scale = this.motioncfg!.scale[morphTarget]
  
              if (offset !== void 0 && scale !== void 0) {
                this.expressionData[morphTarget] =
                  this.expressionData[morphTarget] * scale + offset
              }
            }
          }
          //set expression
          this.setExpression()
        }

        // update
        this.viewer.update(this.viewer.renderer, this.viewer.camera)
        if (this.viewer.shouldRender()) {
          // render
          this.viewer.render()
          this.viewer.consecutiveRenderFrames++
        } else {
          this.viewer.consecutiveRenderFrames = 0
        }
        this.viewer.renderNextFrame = false
      }
      this.viewer.selfDrivenModeRunning = true
    } else {
      throw new Error('Cannot start viewer unless it is in self driven mode.')
    }
  }


  private isHexColorStrict(value: string) {
    if (typeof value !== 'string') return false;
    const hexColorRegex = /^(#|0x)[0-9A-Fa-f]{6}$/i;
    return hexColorRegex.test(value);
}
  private setExpression() {
    // const sortedKeys = Object.keys(this.expressionData).sort()
    // const entries = sortedKeys.map((key) => this.expressionData[key])
    // if (this.viewer && this.viewer.splatMesh && entries.length > 0) {
    //   this.viewer.splatMesh.bsWeight = entries
    // }
    if (this.viewer && this.viewer.splatMesh) {
      this.viewer.splatMesh.bsWeight = this.expressionData as any
    }

    if (this.model) {
      this.model.traverse((object: any) => {
        if (object.isMesh || object.isSkinnedMesh) {
          const morphAttributes = object.geometry.morphAttributes
          const hasMorphTargets = Object.keys(morphAttributes).length > 0
          if (hasMorphTargets === true) {
            const morphTargetDictionary = object.morphTargetDictionary
            for (const morphTarget in morphTargetDictionary) {
              const target = morphTargetDictionary[morphTarget]
              const data = this.expressionData[morphTarget]
              if (data !== void 0) {
                object.morphTargetInfluences[target] = Math.max(
                  0.0,
                  Math.min(1.0, data)
                )
              }
            }
          }
        }
      })
    }
  }

  
  private async loadFlameModel(
    pathName: string,
    motionConfig: IMotionConfig
  ) {
    const [skinModel, lbs_weight_80k, flame_params, indexes, bone_tree] =
      await Promise.all([
        this.unpackAndLoadGlb(pathName + '/skin.glb'), // model with skeleton
        this.unpackAndLoadJson(pathName + '/lbs_weight_20k.json'), // lbs weights
        this.unpackAndLoadJson(pathName + '/flame_params.json'), //  flame params
        this.unpackAndLoadJson(pathName + '/vertex_order.json'), // vertex order
        this.unpackAndLoadJson(pathName + '/bone_tree.json') //  bone tree
      ])
    if (!this.viewer) {
      throw new Error('render viewer is not initialized')
    }

    let skinModelSkinnedMesh;
    let boneRoot;
    (skinModel as any).traverse((object: any) => {
      if (object.isSkinnedMesh) {
        skinModelSkinnedMesh = object
      }
      if (object instanceof THREE.Bone && object.name == "hip") {
        boneRoot = object;
      }
    })

    this.viewer.sortedIndexes = indexes
    this.viewer.flame_params = flame_params;
    this.viewer.lbs_weight_80k = lbs_weight_80k;
    this.viewer.bone_tree = bone_tree;
    this.viewer.totalFrames = flame_params['expr'].length;
    if (skinModelSkinnedMesh!=undefined) {
      this.viewer.gaussianSplatCount = (skinModelSkinnedMesh as THREE.SkinnedMesh).geometry.attributes.position.count

    }
    this.viewer.avatarMesh = skinModel as THREE.Group<THREE.Object3DEventMap>
    this.viewer.skinModel = skinModelSkinnedMesh
    this.viewer.boneRoot = boneRoot

    this.motioncfg = motionConfig

    if (skinModelSkinnedMesh != undefined) {
      this.viewer.updateMorphTarget(skinModelSkinnedMesh as THREE.SkinnedMesh)
    }

    this.viewer.threeScene.add(skinModel as THREE.Group<THREE.Object3DEventMap>);

    (skinModel as THREE.Group<THREE.Object3DEventMap>).visible = false
    if (skinModelSkinnedMesh!=undefined) {
      (skinModelSkinnedMesh as THREE.SkinnedMesh).skeleton.computeBoneTexture()

    }
  }

  private async loadModel(
    pathName: string,
    animationConfig: IAnimationConfig,
    motionConfig: IMotionConfig
  ) {
    const [skinModel, aniclip, indexes] =
      await Promise.all([
        this.unpackAndLoadGlb(pathName + '/skin.glb'),
        this.unpackAndLoadGlb(pathName + '/animation.glb'),
        this.unpackAndLoadJson(pathName + '/vertex_order.json')
      ])


      if (!this.viewer) {
      throw new Error('render viewer is not initialized')
    }

    let skinModelSkinnedMesh;
    let boneRoot;
    (skinModel as any).traverse((object: any) => {
      if (object.isSkinnedMesh) {
        skinModelSkinnedMesh = object
      }
      if (object instanceof THREE.Bone && object.name == "hip") {
        boneRoot = object;
      }
    })

    this.viewer.sortedIndexes = indexes
    if (skinModelSkinnedMesh!=undefined) {
      this.viewer.gaussianSplatCount = (skinModelSkinnedMesh as THREE.SkinnedMesh).geometry.attributes.position.count

    }
    this.viewer.avatarMesh = skinModel as THREE.Group<THREE.Object3DEventMap>
    this.viewer.skinModel = skinModelSkinnedMesh
    this.viewer.boneRoot = boneRoot

    this.mixer = new THREE.AnimationMixer((skinModel as THREE.Group<THREE.Object3DEventMap>))
    this.animManager = new AnimationManager(
      this.mixer,
      aniclip as unknown as THREE.AnimationClip[],
      animationConfig
    )
    this.motioncfg = motionConfig

    if (skinModelSkinnedMesh != undefined) {
      this.viewer.updateMorphTarget(skinModelSkinnedMesh as THREE.SkinnedMesh)
    }

    this.viewer.threeScene.add(skinModel as THREE.Group<THREE.Object3DEventMap>);

    (skinModel as THREE.Group<THREE.Object3DEventMap>).visible = false
    if (skinModelSkinnedMesh!=undefined) {
      (skinModelSkinnedMesh as THREE.SkinnedMesh).skeleton.computeBoneTexture()

    }
  }

  private async unpackFileAsBlob(path: string) {
    if (!this.zipUrls.urls.has(path)) {
      const modelFile = await this.zipUrls.zip?.file(path)?.async('blob')
      const modelUrl = URL.createObjectURL(modelFile!)
      this.zipUrls.urls.set(path, modelUrl)
    }
    return this.zipUrls.urls.get(path)
  }
  private async unpackAndLoadGlb(path: string) {
    if (!this.zipUrls.urls.has(path)) {
      const modelFile = await this.zipUrls.zip?.file(path)?.async('arraybuffer')
      const blob = new Blob([modelFile!], { type: 'model/gltf-binary' })
      const modelUrl = URL.createObjectURL(blob)
      this.zipUrls.urls.set(path, modelUrl)
    }
    return this.LoadGLTF(this.zipUrls.urls.get(path)!)
  }
  private async unpackAndLoadJson(path: string) {
    const jsonFile = await this.zipUrls.zip?.file(path)?.async('string')
    return JSON.parse(jsonFile!)
  }
  
  private async LoadGLTF(
    url: string
  ): Promise<THREE.Group | THREE.AnimationClip[]> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader(undefined)
      loader.load(
        url,
        (gltf: GLTF) => {
          if (gltf.animations.length > 0) resolve(gltf.animations)
          else resolve(gltf.scene)
        },
        undefined,
        (error: unknown) => {
          reject(error)
        }
      )
    })
  }
}
