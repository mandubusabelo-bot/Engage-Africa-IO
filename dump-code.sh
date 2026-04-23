#!/bin/bash
# Script to concatenate all source files into one file for AI analysis

OUTPUT_FILE="codebase-dump.txt"
echo "Dumping codebase to $OUTPUT_FILE..."

# Clear the output file
> "$OUTPUT_FILE"

# Add header
echo "=== Engage Africa Unified Codebase Dump ===" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Find and concatenate all relevant source files
find . \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/.turbo/*" \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) \
  -type f | sort | while read file; do
  echo "=== File: $file ===" >> "$OUTPUT_FILE"
  cat "$file" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
done

echo "Done! Output saved to $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
