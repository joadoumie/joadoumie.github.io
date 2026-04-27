export type Project = {
  glyph: string;
  hash: string;
  title: string;
  desc: string;
  tags: string[];
  href: string;
};

export const PROJECTS: Project[] = [
  {
    glyph: '●',
    hash: 'a4f1c20',
    title: 'oh-my-posh · nba integration',
    desc: 'live nba scores in your terminal prompt. a small custom segment for the oh-my-posh prompt engine that pulls the current/most recent game for your team and renders it inline.',
    tags: ['go', 'oss', 'cli'],
    href: 'https://github.com/joadoumie',
  },
  {
    glyph: '●',
    hash: '7e2b9af',
    title: 'nba cmdpal · windows command palette',
    desc: 'an extension for the windows command palette that surfaces nba scores, schedules, and standings without leaving your keyboard. shipped on the microsoft store.',
    tags: ['c#', 'windows', 'shipped'],
    href: 'https://apps.microsoft.com/detail/9p7xvwkzs7s2',
  },
  {
    glyph: '●',
    hash: '3c8d5e1',
    title: 'jordi rants · the blog',
    desc: 'long-form notes on tools, workflows, agentic ai, and the occasional basketball metaphor. no newsletter, no popups, just words on a page.',
    tags: ['writing'],
    href: 'https://joadoumie.github.io/jordi-rants/',
  },
  {
    glyph: '●',
    hash: '0b9e44d',
    title: 'youtube · jordi adoumie',
    desc: 'videos about software engineering, devex, and the tools i use to work. less tutorial, more shop talk.',
    tags: ['video'],
    href: 'https://www.youtube.com/@jordiadoumie1919',
  },
];
