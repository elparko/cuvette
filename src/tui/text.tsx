import React from "react";
import { Text as InkText, type TextProps } from "ink";

const SEQUENCE =
  /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?|\x1b[P^_X][^\x1b]*(?:\x1b\\)?|\x1b\[[0-?]*[ -/]*[@-~]?|\x1b[ -/]*[0-~]?|\x9b[0-?]*[ -/]*[@-~]|\x9d[^\x07\x9c]*[\x07\x9c]?|[\x90\x98\x9e\x9f][^\x9c]*\x9c?/g;
const CONTROL = /[\x00-\x08\x0b-\x1f\x7f-\x9f‪-‮⁦-⁩]/g;

export function plainText(s: string): string {
  return s.replace(SEQUENCE, "").replace(CONTROL, "");
}

export function Text({ children, ...props }: TextProps) {
  return <InkText {...props}>{React.Children.map(children, (c) => (typeof c === "string" ? plainText(c) : c))}</InkText>;
}
