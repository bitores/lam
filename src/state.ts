import * as THREE from 'three'

import { IAnimationConfig, TYVoiceChatState } from './interface'

export class AnimationManager {
  static IsBlending: boolean = false
  static actions: THREE.AnimationAction[] = []
  //20
  static LastAction: THREE.AnimationAction | undefined
  static CurPlaying: TYVoiceChatState | undefined
  static NeedReset: boolean = false
  static NeedFullReset: boolean = false
  static SetWeight(action: THREE.AnimationAction, weight: number) {
    action.enabled = true
    action.setEffectiveTimeScale(1)
    action.setEffectiveWeight(weight)
  }
  static PrepareCrossFade(
    startAction: THREE.AnimationAction,
    endAction: THREE.AnimationAction,
    defaultDuration: number
  ) {
    // Switch default / custom crossfade duration (according to the user's choice)
    const duration = defaultDuration

    // Make sure that we don't go on in singleStepMode, and that all actions are unpaused
    AnimationManager.UnPauseAllActions()

    // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    AnimationManager.ExecuteCrossFade(startAction, endAction, duration)

    AnimationManager.IsBlending = true

    setTimeout(() => {
      AnimationManager.IsBlending = false
    }, defaultDuration + 0.1)
  }
  static PauseAllActions() {
    AnimationManager.actions.forEach(function (action) {
      action.paused = true
    })
  }
  static UnPauseAllActions() {
    AnimationManager.actions.forEach(function (action) {
      action.paused = false
    })
  }
  static ExecuteCrossFade(
    startAction: THREE.AnimationAction,
    endAction: THREE.AnimationAction,
    duration: number
  ) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    AnimationManager.SetWeight(endAction, 1)
    endAction.time = 0

    // Crossfade with warping - you can also try without warping by setting the third parameter to false
    startAction.crossFadeTo(endAction, duration, true)
  }
  public hello: Hello
  public idle: Idle
  public listen: Listen
  public think: Think
  public speak: Speak

  public mixer: THREE.AnimationMixer

  constructor(
    _mixer: THREE.AnimationMixer,
    _animations: THREE.AnimationClip[],
    _animationcfg: IAnimationConfig
  ) {
    const helloActions: THREE.AnimationAction[] = [] //3
    const idleActions: THREE.AnimationAction[] = [] //1
    const listenActions: THREE.AnimationAction[] = [] //3
    const speakActions: THREE.AnimationAction[] = [] //8
    const thinkActions: THREE.AnimationAction[] = [] //3
    this.mixer = _mixer

    const helloIdx: number = _animationcfg.hello.size
    const idleIdx: number = _animationcfg.idle.size + helloIdx
    const listenIdx: number = _animationcfg.listen.size + idleIdx
    const speakIdx: number = _animationcfg.speak.size + listenIdx
    const thinkIdx: number = _animationcfg.think.size + speakIdx

    for (let i = 0; i < _animations.length; i++) {
      const clip = _animations[i]
      const action = _mixer.clipAction(clip)

      if (i < helloIdx) {
        helloActions.push(action)
      } else if (i < idleIdx) {
        idleActions.push(action)
        if (listenIdx == idleIdx) {
          const newAction = _mixer.clipAction(clip.clone())
          listenActions.push(newAction)
        }
        if (speakActions == listenActions) {
          const newAction = _mixer.clipAction(clip.clone())
          speakActions.push(newAction)
        }
        if (thinkIdx == speakIdx) {
          const newAction = _mixer.clipAction(clip.clone())
          thinkActions.push(newAction)
        }
      } else if (i < listenIdx) {
        listenActions.push(action)
      } else if (i < speakIdx) {
        speakActions.push(action)
      } else if (i < thinkIdx) {
        thinkActions.push(action)
      }
      AnimationManager.actions.push(action)
      AnimationManager.SetWeight(action, 0)
    }

    this.hello = new Hello(helloActions, _animationcfg.hello.isGroup)
    this.idle = new Idle(idleActions, _animationcfg.idle.isGroup)
    this.listen = new Listen(listenActions, _animationcfg.listen.isGroup)
    this.think = new Think(thinkActions, _animationcfg.think.isGroup)
    this.speak = new Speak(speakActions, _animationcfg.speak.isGroup)
  }

  curPlaying(): TYVoiceChatState | undefined {
    if (this.hello.isPlaying) return TYVoiceChatState.Idle
    if (this.idle.isPlaying) return TYVoiceChatState.Idle
    if (this.listen.isPlaying) return TYVoiceChatState.Listening
    if (this.think.isPlaying) return TYVoiceChatState.Thinking
    if (this.speak.isPlaying) return TYVoiceChatState.Responding
    return undefined
  }
  public dispose() {
    this.hello.dispose()
    this.idle.dispose()
    this.listen.dispose()
    this.think.dispose()
    this.speak.dispose()
  }

  resetAllActions(ignoreBlending: boolean = false) {
    const curPlaying = this.curPlaying()
    switch (curPlaying) {
      case TYVoiceChatState.Idle:
        AnimationManager.LastAction = this.hello.actions[this.hello.stage]
        break
      case TYVoiceChatState.Listening:
        AnimationManager.LastAction = this.listen.actions[this.listen.stage]
        break
      case TYVoiceChatState.Thinking:
        AnimationManager.LastAction = this.think.actions[this.think.stage]
        break
      case TYVoiceChatState.Responding:
        AnimationManager.LastAction = this.speak.actions[this.speak.stage]
        // this.speak.isPlaying = false;
        break
      default:
        AnimationManager.LastAction = undefined
        break
    }

    if (AnimationManager.LastAction) {
      AnimationManager.LastAction.loop = THREE.LoopOnce
      AnimationManager.LastAction.clampWhenFinished = true
      AnimationManager.SetWeight(AnimationManager.LastAction, 1.0)
    }

    if (ignoreBlending) {
      AnimationManager.PauseAllActions()
      AnimationManager.actions.forEach(function (action) {
        action.time = 0
        AnimationManager.SetWeight(action, 0.0)
      })
      AnimationManager.LastAction = undefined
    }

    this.hello.isPlaying = false
    this.idle.isPlaying = false
    this.listen.isPlaying = false
    this.think.isPlaying = false
    this.speak.isPlaying = false
  }
  update(state: TYVoiceChatState) {
    if (AnimationManager.IsBlending) return

    AnimationManager.CurPlaying = this.curPlaying()

    if (AnimationManager.CurPlaying == undefined) {
      switch (state) {
        case TYVoiceChatState.Idle:
          this.idle.update(state)
          break
        case TYVoiceChatState.Listening:
          this.listen.update(state)
          break
        case TYVoiceChatState.Thinking:
          this.think.update(state)
          break
        case TYVoiceChatState.Responding:
          this.speak.update(state)
          break
        default:
          this.idle.update(state)
          break
      }
    } else {
      switch (AnimationManager.CurPlaying) {
        case TYVoiceChatState.Idle:
          this.idle.update(state)
          break
        case TYVoiceChatState.Listening:
          this.listen.update(state)
          break
        case TYVoiceChatState.Thinking:
          this.think.update(state)
          break
        case TYVoiceChatState.Responding:
          this.speak.update(state)
          break
        default:
          this.idle.update(state)
          break
      }
    }
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
}

class State {
  public isPlaying: boolean = false
  public stage: number = 0
  public actions: THREE.AnimationAction[] = []
  public blendingTime: number = 0.5
  public isGroup: boolean = false

  constructor(_actions: THREE.AnimationAction[], _isGroup: boolean) {
    this.actions = _actions
    this.isGroup = _isGroup
  }

  public dispose() {
    this.actions = []
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(state: TYVoiceChatState) {
  }
}

class Hello extends State {
  constructor(_actions: THREE.AnimationAction[], _isGroup: boolean) {
    super(_actions, _isGroup)
  }

  override update(state: TYVoiceChatState) {
    if (
      AnimationManager.CurPlaying == undefined &&
      state == TYVoiceChatState.Idle &&
      this.isPlaying == false
    ) {
      this.stage = 0
      this.actions[this.stage].time = 0
      AnimationManager.SetWeight(this.actions[this.stage], 1.0)
      this.actions[this.stage].loop = THREE.LoopRepeat
      this.actions[this.stage].clampWhenFinished = false
      this.actions[this.stage].paused = false
      this.actions[this.stage].play()

      if (AnimationManager.LastAction != undefined) {
        AnimationManager.PrepareCrossFade(
          AnimationManager.LastAction,
          this.actions[this.stage],
          this.blendingTime
        )
      }
      this.isPlaying = true
    }

    if (
      AnimationManager.CurPlaying == TYVoiceChatState.Idle &&
      state == TYVoiceChatState.Idle &&
      this.isPlaying == true
    ) {
      if (
        this.actions[this.stage].time >
        this.actions[this.stage].getClip().duration - this.blendingTime
      ) {
        let nextStage = this.stage + 1
        if (nextStage >= this.actions.length) nextStage = 0
        this.actions[nextStage].time = 0
        AnimationManager.SetWeight(this.actions[nextStage], 1.0)
        this.actions[nextStage].loop = THREE.LoopRepeat
        this.actions[nextStage].play()
        AnimationManager.PrepareCrossFade(
          this.actions[this.stage],
          this.actions[nextStage],
          this.blendingTime
        )
        this.stage = nextStage
      }
    }
  }
}

class Idle extends State {
  constructor(_actions: THREE.AnimationAction[], _isGroup: boolean) {
    super(_actions, _isGroup)
  }

  override update(state: TYVoiceChatState) {
    if (
      AnimationManager.CurPlaying == undefined &&
      state == TYVoiceChatState.Idle &&
      this.isPlaying == false
    ) {
      this.stage = 0
      this.actions[this.stage].time = 0
      AnimationManager.SetWeight(this.actions[this.stage], 1.0)
      this.actions[this.stage].loop = THREE.LoopRepeat
      this.actions[this.stage].clampWhenFinished = false
      this.actions[this.stage].paused = false
      this.actions[this.stage].play()

      if (AnimationManager.LastAction != undefined) {
        AnimationManager.PrepareCrossFade(
          AnimationManager.LastAction,
          this.actions[this.stage],
          this.blendingTime
        )
      }
      this.isPlaying = true
    }
    if (
      AnimationManager.CurPlaying == TYVoiceChatState.Idle &&
      state != TYVoiceChatState.Idle &&
      this.isPlaying == true &&
      this.stage == 0
    ) {
      this.actions[this.stage].loop = THREE.LoopOnce
      this.actions[this.stage].clampWhenFinished = true
      // if(this.actions[this.stage].paused)
      {
        this.isPlaying = false
        AnimationManager.LastAction = this.actions[this.stage]
      }
    }
  }
}

class Listen extends State {
  constructor(_actions: THREE.AnimationAction[], _isGroup: boolean) {
    super(_actions, _isGroup)
  }

  override update(state: TYVoiceChatState) {
    if (
      AnimationManager.CurPlaying == undefined &&
      state == TYVoiceChatState.Listening &&
      this.isPlaying == false
    ) {
      this.stage = 0
      this.actions[this.stage].time = 0
      this.actions[this.stage].play()
      AnimationManager.SetWeight(this.actions[this.stage], 1.0)
      this.actions[this.stage].loop = this.isGroup
        ? THREE.LoopOnce
        : THREE.LoopRepeat
      this.actions[this.stage].clampWhenFinished = this.isGroup ? true : false
      if (AnimationManager.LastAction != undefined)
        AnimationManager.PrepareCrossFade(
          AnimationManager.LastAction,
          this.actions[this.stage],
          this.blendingTime
        )
      this.isPlaying = true
    }
    if (this.isGroup) {
      if (
        AnimationManager.CurPlaying == TYVoiceChatState.Listening &&
        state == TYVoiceChatState.Listening &&
        this.isPlaying == true &&
        this.stage == 0
      ) {
        if (
          this.actions[this.stage].time >
          this.actions[this.stage].getClip().duration - this.blendingTime
        ) {
          this.actions[this.stage + 1].time = 0
          AnimationManager.SetWeight(this.actions[this.stage + 1], 1.0)
          this.actions[this.stage + 1].loop = THREE.LoopRepeat
          this.actions[this.stage + 1].play()
          AnimationManager.PrepareCrossFade(
            this.actions[this.stage],
            this.actions[this.stage + 1],
            this.blendingTime
          )
          this.stage = 1
        }
      }
      if (
        AnimationManager.CurPlaying == TYVoiceChatState.Listening &&
        state != TYVoiceChatState.Listening &&
        this.isPlaying == true &&
        (this.stage == 0 || this.stage == 1)
      ) {
        //if(this.actions[this.stage].time > this.actions[this.stage].getClip().duration - 0.3)
        {
          this.actions[2].time = 0
          this.actions[2].play()
          AnimationManager.SetWeight(this.actions[2], 1.0)
          this.actions[2].loop = THREE.LoopOnce
          AnimationManager.PrepareCrossFade(
            this.actions[this.stage],
            this.actions[2],
            this.blendingTime
          )
          this.stage = 2
        }
      }
    }

    if (
      AnimationManager.CurPlaying == TYVoiceChatState.Listening &&
      state != TYVoiceChatState.Listening &&
      this.isPlaying == true &&
      this.stage == (this.isGroup ? this.actions.length - 1 : 0)
    ) {
      this.actions[this.stage].loop = THREE.LoopOnce
      this.actions[this.stage].clampWhenFinished = true
      //if(this.actions[this.stage].paused)
      // if (
      //   this.actions[this.stage].time >
      //   this.actions[this.stage].getClip().duration - 0.3
      // )
      {
        this.isPlaying = false
        AnimationManager.LastAction = this.actions[this.stage]
      }
    }
  }
}

class Think extends State {
  constructor(_actions: THREE.AnimationAction[], _isGroup: boolean) {
    super(_actions, _isGroup)
  }

  override update(state: TYVoiceChatState) {
    if (
      AnimationManager.CurPlaying == undefined &&
      state == TYVoiceChatState.Thinking &&
      this.isPlaying == false
    ) {
      this.stage = 0
      this.actions[this.stage].time = 0
      this.actions[this.stage].play()
      AnimationManager.SetWeight(this.actions[this.stage], 1.0)
      this.actions[this.stage].loop = THREE.LoopOnce
      if (AnimationManager.LastAction != undefined)
        //this.actions[this.stage].crossFadeFrom(AnimationManager.LastAction, 0.3, true);
        AnimationManager.PrepareCrossFade(
          AnimationManager.LastAction,
          this.actions[this.stage],
          this.blendingTime
        )
      this.isPlaying = true
    }
    if (this.isGroup) {
      if (
        AnimationManager.CurPlaying == TYVoiceChatState.Thinking &&
        state == TYVoiceChatState.Thinking &&
        this.isPlaying == true &&
        this.stage == 0
      ) {
        if (
          this.actions[this.stage].time >
          this.actions[this.stage].getClip().duration - this.blendingTime
        ) {
          this.actions[this.stage + 1].time = 0
          this.actions[this.stage + 1].play()
          AnimationManager.SetWeight(this.actions[this.stage + 1], 1.0)
          this.actions[this.stage + 1].loop = THREE.LoopRepeat
          // this.actions[this.stage].crossFadeTo(this.actions[this.stage + 1], 0.3, true);
          AnimationManager.PrepareCrossFade(
            this.actions[this.stage],
            this.actions[this.stage + 1],
            this.blendingTime
          )
          this.stage = 1
        }
      }
      if (
        AnimationManager.CurPlaying == TYVoiceChatState.Thinking &&
        state != TYVoiceChatState.Thinking &&
        this.isPlaying == true &&
        (this.stage == 0 || this.stage == 1)
      ) {
        //if(this.actions[this.stage].time > this.actions[this.stage].getClip().duration - this.blendingTime)
        {
          this.actions[2].time = 0
          this.actions[2].play()
          AnimationManager.SetWeight(this.actions[2], 1.0)
          this.actions[2].loop = THREE.LoopOnce
          // this.actions[this.stage].crossFadeTo(this.actions[2], 0.3, true);
          AnimationManager.PrepareCrossFade(
            this.actions[this.stage],
            this.actions[2],
            this.blendingTime
          )
          this.stage = 2
        }
      }
    }

    if (
      AnimationManager.CurPlaying == TYVoiceChatState.Thinking &&
      state != TYVoiceChatState.Thinking &&
      this.isPlaying == true &&
      this.stage == (this.isGroup ? this.actions.length - 1 : 0)
    ) {
      this.actions[this.stage].loop = THREE.LoopOnce
      this.actions[this.stage].clampWhenFinished = true
      // if(this.actions[this.stage].paused)
      if (
        this.actions[this.stage].time >
        this.actions[this.stage].getClip().duration - 0.3
      )
      {
        this.isPlaying = false
        AnimationManager.LastAction = this.actions[this.stage]
      }
    }
  }
}

class Speak extends State {
  constructor(_actions: THREE.AnimationAction[], _isGroup: boolean) {
    super(_actions, _isGroup)
  }

  getRandonNumber(max: number, min: number): number {
    const range = max - min
    return min + Math.round(Math.random() * range)
  }

  override update(state: TYVoiceChatState) {
    if (
      AnimationManager.CurPlaying == undefined &&
      state == TYVoiceChatState.Responding &&
      this.isPlaying == false
    ) {
      //this.stage = Math.ceil(this.getRandonNumber(0, 7));
      this.stage = Math.ceil(this.getRandonNumber(0, this.actions.length - 1))
      this.actions[this.stage].time = 0

      this.actions[this.stage].play()
      AnimationManager.SetWeight(this.actions[this.stage], 1.0)
      this.actions[this.stage].loop = THREE.LoopOnce
      this.actions[this.stage].clampWhenFinished = true
      if (AnimationManager.LastAction != undefined)
        AnimationManager.PrepareCrossFade(
          AnimationManager.LastAction,
          this.actions[this.stage],
          this.blendingTime
        )
      this.isPlaying = true
    }
    if (
      AnimationManager.CurPlaying == TYVoiceChatState.Responding &&
      state == TYVoiceChatState.Responding &&
      this.isPlaying == true
    ) {
      if (
        this.actions[this.stage].time >=
        this.actions[this.stage].getClip().duration - this.blendingTime
      ) {
        const lastAction = this.actions[this.stage]
        // this.stage = (this.stage + Math.ceil(this.getRandonNumber(1, 7))) % 8 ;
        this.stage =
          (this.stage +
            Math.ceil(this.getRandonNumber(1, this.actions.length - 1))) %
          this.actions.length

        this.actions[this.stage].time = 0
        // this.actions[this.stage].paused = false;
        this.actions[this.stage].play()
        AnimationManager.SetWeight(this.actions[this.stage], 1.0)
        this.actions[this.stage].loop = THREE.LoopOnce
        this.actions[this.stage].clampWhenFinished = true
        AnimationManager.PrepareCrossFade(
          lastAction,
          this.actions[this.stage],
          this.blendingTime
        )
      }
    }

    if (
      AnimationManager.CurPlaying == TYVoiceChatState.Responding &&
      state != TYVoiceChatState.Responding &&
      this.isPlaying == true
    ) {
      this.actions[this.stage].loop = THREE.LoopOnce
      this.actions[this.stage].clampWhenFinished = true
      // if(this.actions[this.stage].paused)
      // if(this.actions[this.stage].time > this.actions[this.stage].getClip().duration - this.blendingTime)
      {
        this.isPlaying = false
        AnimationManager.LastAction = this.actions[this.stage]
      }
    }
  }
}
