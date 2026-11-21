# OYN 架构契约

本文件是**当前架构边界的唯一规范入口**。改 API、交互、动画、材质或渲染前先读它。
实现必须符合这里的契约；发现偏差时同时修正实现、测试和文档，不保留互相矛盾的说明。

- [设计哲学](docs/ceramic-design.md)：组件应呈现什么空间关系与动作。
- [UI 使用与交付](packages/ui/README.md)：组件源文件、SDK 组合、registry。
- [Surface API](packages/surface/README.md) / [内部源码地图](packages/surface/ARCHITECTURE.md)：接口细节与阅读顺序。
- [Ceramic 光学契约](packages/ceramic/README.md)：颜色、光照、阴影、padding 与几何。
- [HANDOFF](HANDOFF.md)：历史研究、测量和迁移记录，**不是当前 API 或边界的依据**。

## 1. 先找输出，再指定唯一 owner

“Single source of control”指**同一个输出只能由一条路径写入**，不是把所有工作塞进一个包，
也不是全项目只能有一个 requestAnimationFrame。两个不同职责的时钟可以存在；
两个同时控制相同高度、位移、阴影、选择状态或 canvas 的机制不可以。

| 输出 / 决策 | 唯一 owner | 不应做的事 |
| --- | --- | --- |
| 点击动作、选中值、表单、键盘激活、ARIA、焦点管理 | 原生 HTML / 当前组件的 UI SDK 或 Base UI | OYN 不重做选择器、触发 click、抢焦点或阻止 SDK 事件 |
| DOM 结构、命中区、尺寸、圆角、裁切、堆叠顺序 | 组件 / 应用的 DOM 与 CSS | elevation 不修改 z-index；Surface 不重新布局或代管滚动 |
| 静止/悬停/按住/选中对应的目标高度 | UI consumer | Ceramic 不识别 button/tab，不把负高度推断成 selected |
| 动画曲线、目标、当前位置/速度、打断、减少动态效果 | UI consumer 的数值源；DOM 位移动画也可由 CSS/SDK 拥有 | Surface/Ceramic 不提供第二套 spring、transition、hover/press 动画策略 |
| 将数值源连接到材质 setter | `bindMotion(source, write)` | adapter 只订阅/转发/退订，不插值、不调度动画、不提交 GPU |
| 即时数值 → 几何/光学/阴影、外扩预算 | Ceramic | 不补动画、不改变 caller 曲线、不用 CSS 重画同一材质阴影 |
| 共享指针位置、窗口焦点、页面可见性事实 | Surface inputs | 不产生默认光源或按钮按压语义 |
| 指针事实 → 光的位置、hold/return/fixed；环境 → 颜色/光照 | Ceramic | Surface 不读主题、CSS 圆角或推断材质光照 |
| 绑定/解绑、canvas、测量、GPU 资源、失效合并、绘制提交 | Surface | consumer 不创建第二张材质 canvas、GPUDevice 或提交循环 |
| GPU 未启用的视觉回退、文字、数据标记、焦点轮廓 | 组件 CSS | `data-oyn-active` 只由 Surface 写；启用 GPU 后回退不叠画 |
| 几何编译、生成的 shader 镜像 | 离线工具 | 不在交互中重新 bake；不手改 `src/generated/` |

**谁是 consumer？** 调用 Surface 的组件/应用或其自定义 Appearance 适配层。
把代码写进 `Appearance.bind` 不会自动使它成为 Ceramic 的职责：UI 手势与动画绑定仍应放在
`packages/ui` 或应用内。`packages/ceramic` 只保留材质本身。

## 2. 一条写入链，两种使用方式（每个参数二选一）

### 即时声明式数值

```tsx
import { SurfaceProvider, useSurface } from "@oyn/surface";
import { ceramic } from "@oyn/ceramic";

function Key({ selected }: { selected: boolean }) {
  const ref = useSurface({
    appearance: ceramic,
    props: { elevation: selected ? -3.2 : 8, maxElevation: 8 },
  });
  return <button ref={ref} type="button" aria-pressed={selected}>Key</button>;
}

export function Example() {
  return <SurfaceProvider><Key selected={false} /></SurfaceProvider>;
}
```

`elevation` 是**这一刻的数值**，不是一个等待材质缓动过去的目标。上例即时更新；
若需要动画，由 consumer 计算中间值，不向 Surface/Ceramic 添加 `animate`、`transition`
或 MotionValue prop。数值更新复用当前实例和 canvas。

### 外部动画数值源

```tsx
import { useEffect } from "react";
import { materialAppearance, useSurface } from "@oyn/surface";
import { bindMotion, type MotionNumber } from "@oyn/surface/adapters/motion";
import type { CeramicMaterial } from "@oyn/ceramic";

// Caller owns these stable objects and creates the material with a suitable
// maxElevation. The source may be a MotionValue or our consumer-owned spring.
export function AnimatedKey({ height, material }: {
  height: MotionNumber;
  material: CeramicMaterial;
}) {
  const ref = useSurface({ appearance: materialAppearance, props: { material } });
  useEffect(() => bindMotion(height, material.setElevation), [height, material]);
  return <button ref={ref} type="button">Animated key</button>;
}
```

`MotionNumber` 的实际结构是 `get(): number` 和 `on("change", listener): cleanup`。
Surface **没有内置 Motion 依赖，也没有自动接受 MotionValue 的 appearance prop**。
`bindMotion` 已经实现，不是未来计划。外部库或 consumer 自己的运行时都可提供这个接口。

组件库在节点绑定时创建数值源并用 AbortSignal 清理，参考
[`ceramic-control.ts`](packages/ui/src/ceramic-control.ts) 与
[`control-motion.ts`](packages/ui/src/control-motion.ts)。
这让失败、解绑、StrictMode 重放和 provider 停止也能停止节点拥有的动画。
外部共享数值源则由它自己的 caller 管理生命周期，不应被某个 surface 擅自销毁。

```text
SDK / native state ──→ UI target + animation source
                              │ instantaneous number
                              ▼
                         bindMotion
                              │ sole writer
                              ▼
                   Ceramic material.setElevation
                              │ parameter notification
                              ▼
              Surface coalesces invalidations → GPU draw
```

不能同时从声明式 props 和订阅写同一个 elevation；不能在订阅之外再用 effect 写终值；
不能为“压下”同时改变材质高度和缩放命中区。`maxElevation` 只预留阴影空间，
不是 clamp、动画终值或速度限制。可能超过预算的曲线必须由 caller 预留空间。

## 3. 三种“帧”不要混为一谈

1. **consumer 动画帧**：计算数值，保存速度，通知订阅者；不接触 GPU。
2. **CSS / SDK 的 DOM 动画**：移动已有 DOM（thumb、indicator）、展开布局（accordion）。
   SDK 提供状态/目标几何，CSS 插值；不要再为同一 DOM 属性加 JS 插值。
3. **Surface 绘制帧**：合并已变化的参数/布局，读取 binding frame extras，上传并提交 GPU。
   一个 Provider 只有一个绘制调度器。`bindMotion` 不把 consumer 的时钟搬进它。

`Material.bind().frame()` 用于按当前输入计算材质所需的局部坐标等数据，不是把组件的
spring、click、按压计时偷偷放回材质的通道。`requestDraw()` 请求重绘，不是“推进动画”。
连续更新的 consumer 可以持续发出数字；它不能另起渲染循环。

减少动态效果由对应的动画 owner 响应：数值源立即给终态；CSS 使用同一组受媒体查询控制的
时长 token。停止动态不改变选中结果、传播顺序或输入语义。切换偏好无需重新挂载组件。

## 4. 生命周期与组合边界

- `useSurface` 只在 commit 后创建 appearance。ref 绑定定义生命周期；普通 props 更新不重绑。
- **同一 Provider 的同一 DOM host 只有一个 surface binding**。重复绑定是错误，不是“最后一个赢”。
  通常每个 document 挂一个 Provider；嵌套/独立 Provider 不应绑定同一个 host。
- 组合 Trigger → Button → Avatar 时，外层已声明材质，内层只转发 props/ref；不要再接一个材质。
  `render` 回调收到的属性也遵守此规则；原生元素适配器不能把这些属性藏进内层 `render`，
  再让外层包装组件误以为自己需要创建材质。示例和 registry 与正式组件使用同一边界。
- `<input>` 等 void 元素不能容纳 canvas。Field 的容器拥有一个 well，原生 input 保留 ref、caret、label。
  自定义 `render` 并不证明它已提供材质；通过 `FieldWell` 的实际容器边界避免重复，不按组件类型猜测。
- 空 `Material.passes` 表示当前没有绘制内容：Surface 释放 presentation/target，但保留绑定和订阅。
  outline 的存在性从既有动画数值推导，静止无 canvas，离场结束释放；不再添加 visible/enabled 状态。
  有内容时由参数通知或 requestDraw 唤醒同一资源路径。
- 原生按键处理与视觉按压不同。视觉监听器不触发动作；失焦、取消、拖出/拖回、capture、禁用和 pending
  都必须退出或恢复正确暂态；选择值仍由 SDK 持有。
- React 只桥接已提交配置和生命周期，不逐帧 setState、不在 render 写运行中的实例。
- 节点拥有的订阅、observer、动画在 abort/dispose 时释放。外部传入的 source 只退订，不替 caller 销毁。
- Surface 初始化/运行失败会停止该 engine，移除 `data-oyn-active`，释放 presentation 并记录错误。
  **没有 `onError` prop、`enabled` prop 或自动重试**。用 ref 解绑/重绑管理绑定；失败 engine 不因更新而复活。

## 5. 组件截面与实际代码地图

| 行为 | 状态 / 几何来源 | 唯一视觉路径 |
| --- | --- | --- |
| Button、Toggle、导航按压 | SDK/原生状态；`ceramic-control.ts` 读取暂态 | `control-motion.ts` → bindMotion → elevation；选中只改静止高度 |
| Switch / SegmentedControl / Tabs | SDK checked/selected 与 indicator bounds | CSS 移动 thumb/indicator；Ceramic 随 DOM 一起移动 |
| Accordion | SDK open、panel height、presence | CSS height/rotate；没有第二份展开状态或测量 |
| Input / compound fields | 原生输入、SDK group | 一个 FieldWell frame；内容不重画 |
| Dialog / popups | SDK portal、focus、presence；CSS stacking | Ceramic 高度表达光学；CSS 不假造跨元素 3D scene |
| Ripple exploration | `ripple-field.ts` 波传播；`stone-appearance.ts` 手势/动画 | consumer 数值通道 → bindMotion → `createFlipDiscMaterial`；材质不读时钟 |

包依赖方向：`UI / app → Ceramic + Surface`，`Ceramic → Surface public contracts`。
Surface 不依赖 Ceramic、UI SDK 或组件类型；Ceramic 不依赖 React 或组件交互库。
Surface 的 React 入口依赖 runtime，runtime 不反向依赖 React。

## 6. 验证、限制与变更准入

`npm run check:architecture` 检查层间依赖、禁止材质中的交互/动画调度、编译本文示例与负向 API 类型测试。
`npm run test:ui-control` 检查数值源、反向连续性、减弱动态、输入边界与组合。
`npm run test:ui` 检查交付的 registry、Tabs 和完整 catalog；`npm run test:flip-disc` 检查探索页的
WebGPU/WebGL2、波传播、按压、键盘与参数更新。所有浏览器测试 headless。

### 正负高度的光学连续性

标准 analytic Ceramic 的 signed elevation 由**同一个 shader、固定的参数布局、一个 surface pass**处理。
setter 只写高度；正负分支计算这一刻的凸面/凹面光学，不切换程序、不混合两张 canvas，
不增加“过渡进度”或缓存上一帧。consumer 仍是动画曲线的唯一 owner。

当前零高度语义是**融回承载面**：材质覆盖、高光、槽壁、投影和 AO 在零处都消失，
不保留独立的有色涂层。覆盖率由 `abs(elevation)` 唯一推导，零点斜率也趋零；
凸面的 rim 宽度和 AO 范围随高度收缩，不用固定宽度的晕圈掩盖断点。
釉面法线的光学采样轮廓固定在 CSS 空间，可见凸缘带连续收缩；不把尖锐高光轮廓压进亚像素宽度，
否则即使零点连续，中途也会因高光扫过像素中心而闪动。
高光亮度先饱和，再乘几何覆盖率；不能让亮度饱和反过来把局部覆盖变成满覆盖。
这会让高反差/有色表面在跨零时淡出再出现，是明确的 relief 语义，不是可配置的透明度动画。
若未来需要零高度仍保留色面，必须先定义涂层与 relief 的独立职责，而不是在 consumer 叠补偿层。

`npm run test:ceramic-elevation` 同时验证数值契约与浏览器像素：浅色、深色、反差色、有色背景，
逐帧正负往返、零点和分段连接处、AO 收缩、canvas/管线/缓冲复用。
逐帧图与测量在 `test-results/ceramic-continuity/after/`；
`test:ceramic-compatibility` 检查常用凸面高度的既有质感，`test:ceramic-shadow` 检查阴影积分和组合。
显式 card/baked 的几何由 caller/资产给定，不因改 shadow height 自动变成凹面；不要把这个保证泛化到它们。

改动前回答：**哪个输出、谁写、谁触发更新、谁清理？旧路径是否已删除？**
改动后至少验证：静止零调度；快速反向；拖出/取消；禁用/pending；键盘；浅/深色；窄屏；
reduced motion 动态切换；解绑/remount；无 GPU 的可读性。不要把 build 成功当成视觉验收。

当前明确限制：无任意 3D scene 或真正的跨元素投影；elevation 不改变 DOM 遮挡；
axis-aligned target；没有通用逐帧 transform 跟踪、viewport culling 或 per-target dirty redraw。
标准 analytic Ceramic 已有跨零像素连续回归，但它仍是视觉近似，不是物理光传输求解器；
数值连续、光学连续、DOM 位移连续是三项独立验收，不能相互替代。
React Compiler 尚未认证。规范不是“已证明整个项目最优”的声明；新增需求必须有实际用例和验证证据。
