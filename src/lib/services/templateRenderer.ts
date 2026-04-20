export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template

  // Handle {{variable}} replacements
  result = result.replace(
    /\{\{([^}]+)\}\}/g,
    (_, key) => variables[key.trim()] ?? ''
  )

  // Handle {{#if variable}}content{{/if}} conditionals
  result = result.replace(
    /\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => variables[key.trim()] ? content : ''
  )

  return result.trim()
}
