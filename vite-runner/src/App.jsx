import React from "./core/React.js";

let count = 10;
let props = { id: 1111111111111111 };

function Counter() {
  const update = React.update();
  function handleClick() {
    console.log("click");
    count++;
    props = {};
    update();
  }
  return (
    <div {...props}>
      number is: {count}
      <button onClick={handleClick}>update test</button>
    </div>
  );
}

let showBar = true;
function Son() {
  const Bar = (
    <div>
      <p>bar</p>
      <div>bar1</div>
      <div>bar2</div>
    </div>
  );
  const Foo = (
    <div>
      <div>foo</div>
    </div>
  );

  const A = function () {
    return (
      <div>
        <div>a</div>
      </div>
    );
  };

  const B = function () {
    return (
      <div>
        <p>b</p>
      </div>
    );
  };
  const update = React.update();
  function handleClick() {
    showBar = !showBar;
    update();
  }
  return (
    <div>
      <button onClick={handleClick}>click me</button>
      <div>{showBar ? Bar : Foo}</div>
      <div>{showBar ? <A></A> : <B></B>}</div>
      <div>
        Edge Case
        {showBar && Bar}
        <p>hhh</p>
      </div>
    </div>
  );
}

function CounterContainer() {
  return (
    <>
      <Counter></Counter>
    </>
  );
}

function Foo() {
  console.log("Foo render");
  let [count, setCount] = React.useState(0);
  let [msg, setMsg] = React.useState("hello");
  function handleClick() {
    setCount((count) => count + 1);
    setMsg(() => " world");
  }
  React.useEffect(() => {
    console.log("init");
    return () => {
      console.log("cleanup init");
    };
  }, []);
  React.useEffect(() => {
    console.log("useEffect");
    return () => {
      console.log("cleanup count");
    };
  }, [count]);
  return (
    <div>
      <div>foo</div>
      <div>count: {count}</div>
      <div>msg: {msg}</div>
      <button onClick={handleClick}>click</button>
    </div>
  );
}

let countBar = 0;
function Bar() {
  console.log("Bar render");
  const update = React.update();
  function handleClick() {
    countBar++;
    update();
  }
  return (
    <div>
      <div>bar</div>
      {countBar}
      <button onClick={handleClick}>click</button>
    </div>
  );
}

function App() {
  console.log("App render");
  const update = React.update();
  function handleClick() {
    update();
  }
  return (
    <div id="app">
      hi mini-react
      <button onClick={handleClick}>click me</button>
      {/* <CounterContainer></CounterContainer>
      <Son></Son>
      <Son></Son> */}
      <Foo></Foo>
      <Bar></Bar>
    </div>
  );
}

export default App;
