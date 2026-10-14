import { cutText } from "./places.ts";

const shown = (path: string) => {
  const text = path.length > 200 ? `${cutText(path, 200)}...` : path;
  return text.replace(/[\r\n\t]+/g, " ");
};

export function pathRefusalReason(place: "private" | "link", path: string): string {
  return place === "private"
    ? `The agent tried to use ${shown(path)}. This path is in the Cuvette home folder or in the record of another session. Cuvette blocked it. To allow it, write the folder in your next message.`
    : `The agent tried to use ${shown(path)}. This path is a link that leads outside the folders of this analysis. Cuvette blocked it. To allow it, write the real folder in your next message.`;
}

export function writeRefusalReason(path: string, labRules: boolean): string {
  return labRules
    ? `The agent tried to write ${shown(path)}. This file holds the lab rules. Cuvette blocked it. To change a rule, edit the file yourself.`
    : `The agent tried to write ${shown(path)}. This path belongs to the record or to the settings of Cuvette. Cuvette blocked it. Nothing changed.`;
}
