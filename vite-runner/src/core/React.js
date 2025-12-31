function createTextNode(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => {
        const isTextNode =
          typeof child === "string" || typeof child === "number";
        return isTextNode ? createTextNode(child) : child;
      }),
    },
  };
}

// work in progress
let wipRoot = null;
let wipFiber = null;
let currentRoot = null;
function render(el, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [el],
    },
  };
  nextWorkOfUnit = wipRoot;
}

// 任务调度器，fiber 架构
// 一个一个的创建 DOM 节点，结合 requestIdleCallback 判断是否有空闲时间，有的话就直接创建下一个
// 没有的话，就等下一次空闲时间再创建下一个，避免一次创建完所有 DOM 节点导致页面卡顿
// 因此需要一个链表来维护 DOM 节点的创建进度
// DOM 树怎么中转 DOM 链表？
// 1. 先找子节点
// 2. 若 1. 不满足，再找兄弟节点
// 3. 若 2. 不满足，再找父节点的兄弟节点（叔叔节点）
let nextWorkOfUnit = null;
function workLoop(deadline) {
  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit = performWorkOfUnit(nextWorkOfUnit);

    // 终止局部更新
    if (wipRoot?.sibling?.type === nextWorkOfUnit?.type) {
      nextWorkOfUnit = undefined;
    }

    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextWorkOfUnit && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

// 统一提交，统一把所有的 DOM 节点渲染到页面上
// 防止先渲染完几个节点，然后过段时间又渲染几个，对用户体验不友好
// 将 DOM 节点的创建和渲染过程分离，分批（利用 cpu 空闲时间）全部创建完再渲染
function commitRoot() {
  deletions.forEach(commitDeletion);
  commitWork(wipRoot.child);
  commitEffectHook();
  currentRoot = wipRoot;
  wipRoot = null;
  deletions = [];
}

function commitWork(fiber) {
  if (!fiber) return;
  let fiberParent = fiber.parent;
  while (!fiberParent.dom) {
    fiberParent = fiberParent.parent;
  }
  if (fiber.effectTag === "update") {
    updateProps(fiber.dom, fiber.props, fiber.alternate.props);
  } else if (fiber.effectTag === "placement") {
    if (fiber.dom) {
      fiberParent.dom.append(fiber.dom);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitEffectHook() {
  function run(fiber) {
    if (!fiber) return;
    if (!fiber.alternate) {
      // inite
      fiber?.effectHooks?.forEach((hook) => (hook.cleanup = hook.callback()));
    } else {
      // update
      // 判断依赖项是否有改变
      fiber?.effectHooks?.forEach((newHook, index) => {
        const oldEffectHook = fiber.alternate?.effectHooks[index];
        const needUpdate = oldEffectHook?.deps?.some(
          (dep, i) => dep !== newHook.deps[i]
        );
        if (needUpdate) {
          newHook.cleanup = newHook.callback();
        }
      });
    }
    run(fiber.child);
    run(fiber.sibling);
  }

  function runCleanup(fiber) {
    if (!fiber) return;
    fiber?.alternate?.effectHooks?.forEach((hook) => {
      if (hook.deps.length > 0) {
        if (hook.cleanup) {
          hook.cleanup();
        }
      }
    });
    runCleanup(fiber.child);
    runCleanup(fiber.sibling);
  }

  runCleanup(wipRoot);
  run(wipRoot);
}

function commitDeletion(fiber) {
  if (fiber.dom) {
    let fiberParent = fiber.parent;
    while (!fiberParent.dom) {
      fiberParent = fiberParent.parent;
    }
    fiberParent.dom.removeChild(fiber.dom);
  } else if (fiber.child) {
    commitDeletion(fiber.child);
  }
}

function createDom(type) {
  return type === "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(type);
}

function updateProps(dom, nextProps, prevProps) {
  // 1. old 有 new 没有 删除
  Object.keys(prevProps).forEach((key) => {
    if (key !== "children") {
      if (!(key in nextProps)) {
        console.log("删除属性", key);
        dom.removeAttribute(key);
      }
    }
  });
  // 2. new 有 old 没有 添加
  // 3. new 有 old 也有 更新
  // 其实 3. 包含了 2. 的情况，因为 2. 是 3. 的一种特殊情况
  Object.keys(nextProps).forEach((key) => {
    if (key !== "children") {
      if (prevProps[key] !== nextProps[key]) {
        if (key.startsWith("on")) {
          const eventType = key.toLowerCase().substring(2);
          // 先删除旧的事件，再添加新的事件
          dom.removeEventListener(eventType, prevProps[key]);
          dom.addEventListener(eventType, nextProps[key]);
        } else {
          dom[key] = nextProps[key];
        }
      }
    }
  });
}

let deletions = [];
function reconcileChildren(fiber, children) {
  let oldFiber = fiber.alternate?.child;
  let prevChild = null;
  children.forEach((child, index) => {
    const isSameType = oldFiber && child.type === oldFiber.type;
    let newFiber;
    if (isSameType) {
      // update
      newFiber = {
        type: child.type,
        props: child.props,
        child: null,
        parent: fiber,
        sibling: null,
        dom: oldFiber.dom,
        effectTag: "update",
        alternate: oldFiber,
      };
    } else {
      // create
      // 删除旧的
      if (oldFiber) deletions.push(oldFiber);
      // 创建新的
      if (child) {
        newFiber = {
          type: child.type,
          props: child.props,
          child: null,
          parent: fiber,
          sibling: null,
          dom: null,
          effectTag: "placement",
        };
      }
    }
    if (oldFiber) oldFiber = oldFiber.sibling;

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevChild.sibling = newFiber;
    }
    if (newFiber) prevChild = newFiber;
  });

  // 去掉老 DOM 树的同层多余节点
  while (oldFiber) {
    deletions.push(oldFiber);
    oldFiber = oldFiber.sibling;
  }
}

function updateFunctionComponent(fiber) {
  stateHooks = [];
  effectHooks = [];
  stateHookIndex = 0;
  wipFiber = fiber;
  // 3. 转换链表，设置好指针
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    // 1. 创建 dom
    const dom = (fiber.dom = createDom(fiber.type));
    // 2. 处理 props
    updateProps(dom, fiber.props, {});
  }

  // 3. 转换链表，设置好指针
  const children = fiber.props.children;
  reconcileChildren(fiber, children);
}

function performWorkOfUnit(fiber) {
  // function component
  const isFunctionComponent = typeof fiber.type === "function";

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 4. 返回下一个要执行的任务
  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function update() {
  // 这里引入闭包太妙了，可以知道在哪个函数节点里面调用了 update 方法
  // 原理：比如解析 <Counter/> 函数节点时，会执行 updateFunctionComponent 函数
  // 而 updateFunctionComponent 函数中会将当前节点赋值给 wipFiber
  // 然后进入到 <Counter/> 函数节点，执行 js 代码
  // js 代码调用了 update 方法，使得 currentFiber 指向了 <Counter> 函数节点
  // 后续调用 update 返回的函数，就可以获取当前的函数节点
  let currentFiber = wipFiber;
  return () => {
    // wipRoot = {
    //   dom: currentRoot.dom,
    //   props: currentRoot.props,
    //   alternate: currentRoot,
    // };

    // 开始局部更新
    wipRoot = {
      ...currentFiber,
      alternate: currentFiber,
    };
    nextWorkOfUnit = wipRoot;
  };
}

let stateHooks;
let stateHookIndex;
function useState(initial) {
  let currentFiber = wipFiber;
  const oldHook = currentFiber?.alternate?.stateHooks[stateHookIndex];
  const stateHook = {
    state: oldHook ? oldHook.state : initial,
    queue: oldHook ? oldHook.queue : [],
  };

  // 批量更新 action
  stateHook.queue.forEach((action) => {
    stateHook.state = action(stateHook.state);
  });
  stateHook.queue = [];

  stateHookIndex++;
  stateHooks.push(stateHook);

  currentFiber.stateHooks = stateHooks;

  function setState(action) {
    // 闭包太吊了，通过闭包找到了多个 state 中触发更新的那个 state

    // 提前检测，如果 set 前后值一样就不执行
    const eagerState =
      typeof action === "function" ? action(stateHook.state) : action;
    if (eagerState == stateHook.state) return;

    stateHook.queue.push(typeof action === "function" ? action : () => action);
    // 触发页面更新
    wipRoot = {
      ...currentFiber,
      alternate: currentFiber,
    };
    nextWorkOfUnit = wipRoot;
  }

  return [stateHook.state, setState];
}

let effectHooks;
function useEffect(callback, deps) {
  const effectHook = {
    callback,
    deps,
    cleanup: null,
  };
  effectHooks.push(effectHook);
  wipFiber.effectHooks = effectHooks;
}

requestIdleCallback(workLoop);

export default {
  createElement,
  render,
  update,
  useState,
  useEffect,
};
