// DYD — Agent layer barrel.
//
// One module per agent so each can be swapped to a real LLM call
// independently without touching its peers. See ARCHITECTURE.md at repo
// root for what each agent does and where it's called from.

export * as challengeDesigner from "./challenge-designer";
export * as daremaster from "./daremaster";
export * as auditAssistant from "./audit-assistant";
export * as insightExtractor from "./insight-extractor";
export * from "./types";
