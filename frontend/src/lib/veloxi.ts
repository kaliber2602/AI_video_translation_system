import { createApp, DragEventPlugin, DragEvent, type PluginContext } from "veloxi";

export const DragWithSpringPlugin = (context: PluginContext) => {
  const dragEvent = context.useEventPlugin(DragEventPlugin);

  const initDraggableView = (view: any) => {
    if (!view || !view.position) return;
    view.position.animator.set("spring");
    dragEvent.addView(view);
  };

  context.setup(() => {
    const views = context.getViews("draggable");
    if (views && views.length) {
      views.forEach(initDraggableView);
    }

    dragEvent.on(DragEvent, (event: any) => {
      const targetView = event.view;
      if (!targetView || !targetView.position) return;

      if (event.isDragging) {
        targetView.position.set({ x: event.x, y: event.y });
      } else {
        targetView.position.reset();
      }
    });
  });

  context.onViewAdded((view: any) => {
    if (view.name === "draggable") {
      initDraggableView(view);
    }
  });
};

DragWithSpringPlugin.pluginName = "DragWithSpringPlugin";
DragWithSpringPlugin.scope = "draggable";

let veloxiApp: ReturnType<typeof createApp> | null = null;

export function initVeloxi() {
  if (typeof window === "undefined") return null;
  if (veloxiApp) return veloxiApp;

  try {
    veloxiApp = createApp();
    veloxiApp.addPlugin(DragWithSpringPlugin);
    veloxiApp.run();
  } catch (error) {
    console.warn("[VELOXI] Failed to initialize:", error);
  }

  return veloxiApp;
}
