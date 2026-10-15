"use client";

import { useEffect } from "react";
import { translateUiText } from "@/lib/i18n";
import { useLanguage } from "@/components/ui/language-context";

const translatableAttributes = ["placeholder", "title", "aria-label", "alt"] as const;

const isExcluded = (element: Element | null) =>
  !element ||
  Boolean(element.closest("[data-no-translate]")) ||
  ["SCRIPT", "STYLE", "CODE", "PRE"].includes(element.tagName);

const shouldSkipText = (element: Element | null) =>
  isExcluded(element) || element?.tagName === "TEXTAREA";

const translateElement = (root: ParentNode, language: "pt" | "en") => {
  const documentRoot = root instanceof Document ? root.documentElement : root;
  const walker = document.createTreeWalker(documentRoot, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    if (!shouldSkipText(parent) && textNode.data.trim()) {
      const translated = translateUiText(textNode.data, language);
      if (translated !== textNode.data) textNode.data = translated;
    }
    node = walker.nextNode();
  }

  const elements = documentRoot instanceof Element
    ? [documentRoot, ...Array.from(documentRoot.querySelectorAll("*"))]
    : Array.from(document.querySelectorAll("*"));
  elements.forEach((element) => {
    if (isExcluded(element)) return;
    translatableAttributes.forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (!value) return;
      const translated = translateUiText(value, language);
      if (translated !== value) element.setAttribute(attribute, translated);
    });
  });
};

export function GlobalTranslator() {
  const { language } = useLanguage();

  useEffect(() => {
    document.title = language === "pt" ? "AP - Golos Marcados" : "AP - Goals Scored";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = language === "pt"
        ? "Plataforma de análise de golos e análise tática."
        : "Goalscoring and tactical analysis platform.";
    }
    translateElement(document, language);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData" && mutation.target.parentNode) {
          translateElement(mutation.target.parentNode, language);
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element, language);
          if (node.nodeType === Node.TEXT_NODE && node.parentNode) translateElement(node.parentNode, language);
        });
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateElement(mutation.target, language);
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatableAttributes]
    });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
