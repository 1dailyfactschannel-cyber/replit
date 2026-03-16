import { FilterXSS } from "xss";

const xss = new FilterXSS({
  whiteList: {
    a: ["href", "title", "target"],
    b: [],
    i: [],
    p: [],
    br: [],
    ul: [],
    ol: [],
    li: [],
    strong: [],
    em: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
});

/**
 * Sanitize task description to prevent XSS attacks
 * Only allows basic formatting tags
 */
export const sanitizeTaskDescription = (input: string): string => {
  if (!input) return "";
  return xss.process(input);
};

/**
 * Sanitize any user input that will be rendered as HTML
 * Use this for comments, descriptions, notes, etc.
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return "";
  return xss.process(input);
};

/**
 * Strip all HTML tags from input
 * Use this for plain text fields where HTML is not allowed
 */
export const stripHtml = (input: string): string => {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "");
};
