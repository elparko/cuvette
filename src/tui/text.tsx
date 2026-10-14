import React from "react";
import { Text as InkText, type TextProps } from "ink";
import { plainText } from "../core/plain.ts";

export { plainText };

export function Text({ children, ...props }: TextProps) {
  return <InkText {...props}>{React.Children.map(children, (c) => (typeof c === "string" ? plainText(c) : c))}</InkText>;
}
