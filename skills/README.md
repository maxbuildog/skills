# skills/

One folder per skill. The folder name is the skill name.

```
skills/<skill-name>/
├── SKILL.md            required, the entry point
├── references/         optional, docs the agent reads only when it needs them
├── scripts/            optional, executable checks
└── assets/             optional, templates and fixtures
```

Install one on its own:

```bash
npx skills add Xoumaaa23/skills/<skill-name>
```

Writing one: [../docs/skill-authoring.md](../docs/skill-authoring.md). Start from [../docs/SKILL-template.md](../docs/SKILL-template.md).

Validate before pushing: `node scripts/validate-skills.mjs` from the repo root.
