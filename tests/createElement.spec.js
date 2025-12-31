import { it, expect, describe } from "vitest";
import React from "../core/React";

describe("createElement", () => {
  it("props is null", () => {
    const el = React.createElement("div", null, "hi mini-react");

    expect(el).toMatchInlineSnapshot(`
        {
          "props": {
            "children": [
              {
                "props": {
                  "children": [],
                  "nodeValue": "hi mini-react",
                },
                "type": "TEXT_ELEMENT",
              },
            ],
          },
          "type": "div",
        }
        `);
  });

  it("should return element vdom", () => {
    const el = React.createElement("div", { id: "app" }, "hi mini-react");

    expect(el).toMatchInlineSnapshot(`
        {
          "props": {
            "children": [
              {
                "props": {
                  "children": [],
                  "nodeValue": "hi mini-react",
                },
                "type": "TEXT_ELEMENT",
              },
            ],
            "id": "app",
          },
          "type": "div",
        }
        `);
  });
});
