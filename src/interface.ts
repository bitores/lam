export enum TYVoiceChatState {
  Idle = 'Idle',
  Listening = 'Listening',
  Responding = 'Responding',
  Thinking = 'Thinking'
}


export enum InferMode {
  cpu = 'cpu',
  gpu = 'gpu'
}

/**
 * 渲染性能模式
 * @enum
 */
export enum IRenderMode {
  /**
   * 高性能
   */
  High = 'High',
  /**
   * 低性能
   */
  Low = 'Low',
  /**
   * 标准性能
   */
  Standard = 'Standard'
}
/**
 * 3D数字人初始化额外配置
 * @interface
 */
export interface IAvatarAssetExt {
  /**
   * 是否开启阴影
   */
  enableShadow?: boolean
  /**
   * 推理帧率
   */
  inferFps?: number
  /**
   * 推理模式
   */
  inferMode?: InferMode
  /**
   * 开启图片缓存,开启后，会降低渲染性能
   */
  preserveDrawingBuffer?: boolean
  /**
   * 渲染性能模式
   */
  renderMode?: IRenderMode
  /**
   * 垂直同步间隔
   */
  vsyncNum?: number
}
export enum IAvatarAssetModelType {
  'GAUSSIAN_SPLATTING_3D' = 'GAUSSIAN_SPLATTING_3D',
  'REALTIME_AVATAR_3D' = 'REALTIME_AVATAR_3D',
  'REALTIME_AVATAR_LIVE2D' = 'REALTIME_AVATAR_LIVE2D',
  'REALTIME_AVATAR_MOBILE2D' = 'REALTIME_AVATAR_MOBILE2D'
}

export interface IAvatarAssetResponseDataV1 {
  animationConfig: string
  animationUrl: string
  backgroundUrl?: string
  characterConfig: string
  characterModelUrl: string
  hdrUrl?: string
}
export interface IAvatarAssetResponseDataV2 {
  assets: string
  backgroundUrl?: string
  hdrUrl?: string
  type?: IAvatarAssetModelType
}
export type IAvatarAssetResponseData =
  | IAvatarAssetResponseDataV1
  | IAvatarAssetResponseDataV2

export enum AvatarAction {
  Idle = 'idle',
  Listening = 'listen',
  Responding = 'speak',
  Thinking = 'think'
}

export type IAvatarAction = 'hello' | 'idle' | 'listen' | 'speak' | 'think'
export type ISubAnimationConfig = {
  [key in IAvatarAction]: {
    isGroup: boolean
    size: number
  }
}
export interface IAnimationConfig extends ISubAnimationConfig {
  other: {
    name: string
  }[]
}

/**
 * @interface
 * 运动数据
 */
export interface IMotionConfig {
  offset: Record<string, number>
  scale: Record<string, number>
}
