// Phase 1.2 — Corpus frontmatter parser
// Input:  Path to any .md file from dlms/corpus/
// Output: ParsedDocument — typed frontmatter fields + sections JSON map

import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

// Dependency entry as declared in document frontmatter
export interface DependencyEntry {
  doc_id: string;
  rel: string;
  // rel enum: is-governed-by | implements | references | supersedes (DLMS-2026-0020)
}

// All 20 frontmatter fields mapped to TypeDB attribute names.
// Null YAML values are coerced to empty string for optional string fields.
// tags and dependencies are kept as arrays — the importer writes them as
// multiple attribute instances and relation entities respectively.
export interface DocumentFrontmatter {
  doc_id: string;
  title: string;
  doc_type: string;
  status: string;
  version: string;
  created_at: string;       // ISO 8601 string — TypeDB datetime accepts ISO strings
  created_by: string;
  approved_at: string;      // empty string when null in YAML
  approved_by: string;      // empty string when null
  verified_by: string;      // empty string when null
  template_id: string;
  template_ver: string;     // empty string when null
  tags: string[];           // written as multiple `tag` attribute instances in TypeDB
  supersedes_doc: string;   // frontmatter field: supersedes → TypeDB attr: supersedes_doc
  superseded_by_doc: string;// frontmatter field: superseded_by → TypeDB attr: superseded_by_doc
  retention_class: string;
  context_eligible: boolean;
  agent_path: string;
  audit_ref: string;
  dependencies: DependencyEntry[]; // written as `dependency` relations in TypeDB by the importer
}

// Body sections parsed from the .md document body.
// Keys are uppercase section headings (e.g. SUMMARY, RULES).
// Values are the trimmed text content under each heading.
export type SectionsMap = Record<string, string>;

export interface ParsedDocument {
  frontmatter: DocumentFrontmatter;
  sections: SectionsMap;
  // sections is also stored as JSON.stringify(sections) in the TypeDB `sections` attribute
  sectionsJson: string;
}

// Coerce a YAML value that may be null/undefined to an empty string
function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

// Parse the body of a DLMS .md file into a map of section keys → content.
// Splits on lines matching `## ALL_CAPS_HEADING` (uppercase letters and underscores only).
// Any content before the first heading is discarded.
function parseSections(body: string): SectionsMap {
  const sections: SectionsMap = {};

  // Match lines that consist solely of ## followed by an uppercase heading
  // e.g. ## SUMMARY, ## CHANGE_LOG, ## RULES
  const sectionPattern = /^## ([A-Z][A-Z0-9_]+)\s*$/m;
  const parts = body.split(sectionPattern);

  // After splitting: parts[0] = pre-heading text (discard)
  // Then alternating: parts[1] = heading, parts[2] = content, parts[3] = heading, ...
  for (let i = 1; i < parts.length - 1; i += 2) {
    const heading = parts[i].trim();
    const content = parts[i + 1].trim();
    if (heading) {
      sections[heading] = content;
    }
  }

  return sections;
}

// Parse a single DLMS corpus .md file.
// Throws if the file cannot be read or if doc_id is missing from frontmatter.
export function parseCorpusFile(filePath: string): ParsedDocument {
  const raw = readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  if (!data['doc_id']) {
    throw new Error(`Missing doc_id in frontmatter: ${filePath}`);
  }

  // Map YAML field names to TypeDB attribute names.
  // Note: YAML uses `supersedes` and `superseded_by`; TypeDB attrs are
  // `supersedes_doc` and `superseded_by_doc` to avoid keyword conflicts.
  const frontmatter: DocumentFrontmatter = {
    doc_id:           str(data['doc_id']),
    title:            str(data['title']),
    doc_type:         str(data['doc_type']),
    status:           str(data['status']),
    version:          str(data['version']),
    created_at:       str(data['created_at']),
    created_by:       str(data['created_by']),
    approved_at:      str(data['approved_at']),
    approved_by:      str(data['approved_by']),
    verified_by:      str(data['verified_by']),
    template_id:      str(data['template_id']),
    template_ver:     str(data['template_ver']),
    tags:             Array.isArray(data['tags']) ? data['tags'].map(String) : [],
    supersedes_doc:   str(data['supersedes']),
    superseded_by_doc: str(data['superseded_by']),
    retention_class:  str(data['retention_class']),
    context_eligible: Boolean(data['context_eligible']),
    agent_path:       str(data['agent_path']),
    audit_ref:        str(data['audit_ref']),
    dependencies:     parseDependencies(data['dependencies']),
  };

  const sections = parseSections(content);
  const sectionsJson = JSON.stringify(sections);

  return { frontmatter, sections, sectionsJson };
}

// Parse the dependencies array from YAML frontmatter.
// Accepts null, undefined, empty array, or an array of { doc_id, rel } objects.
function parseDependencies(raw: unknown): DependencyEntry[] {
  if (!raw || !Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is Record<string, unknown> =>
      entry !== null && typeof entry === 'object'
    )
    .map((entry) => ({
      doc_id: str(entry['doc_id']),
      rel:    str(entry['rel']),
    }))
    .filter((entry) => entry.doc_id !== '' && entry.rel !== '');
}
