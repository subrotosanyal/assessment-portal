# QA Engineer Assignment

## Problem
You will test a small cancer tissue analysis portal UI that we provide in the grader. Your job is to write a test plan, create a concise defect log, capture exploratory QA notes, and write Playwright tests that validate the behavior of the portal.

## Provided UI (by grader)
The UI is started by the grader on http://localhost:8085. It has these behaviors:
- Form fields: Patient Name, Age, Image upload (.jpg or .png).
- Button: Run Analysis.
- Validation: "Patient Name is required". "Age must be a positive". "Image is required", "Invalid Image".
- On valid submission: it shows a Result section with a simulated PDF link.
- On invalid image: it shows an error text "Invalid image".

![Provided UI](http://localhost:4000/assets/assignments/qa-cancer/docs/images/Sample_UI.png "Provided UI screenshot")

## What to submit
A ZIP with:
```
testplan.md                     # test strategy and prioritization
bug-report.md                   # defects you find; include severity + repro steps
exploratory-notes.md            # charter(s), environment, and observations
tests/
  portal.spec.ts
  sample-data/
    valid.jpg
    not-image.txt
```
Notes:
- Your tests must navigate to http://localhost:8085/.
- Use Playwright test runner.
- For `bug-report.md`, list each defect with: id, area, severity, steps, expected vs actual.
- For `exploratory-notes.md`, capture at least one charter, the data you used, and the observations/risks you would follow up on.

## How grading works
The grader will:
1. Build and run a reference UI on port 8085.
2. Install Playwright in the grader image.
3. Execute your tests. 
4. The playwright config looks like: 
  ```
  import { defineConfig } from '@playwright/test';
  export default defineConfig({
    reporter: [['json', { outputFile: '/workspace/output/playwright.json' }]],
    testDir: './tests',
    timeout: 30000,
    use: {
      baseURL: process.env.BASE_URL || 'http://localhost:8085',
      screenshot: 'on',
      video: 'off',
      trace: 'off',
    },
});
```
5. Look for `testplan.md`, `bug-report.md`, and `exploratory-notes.md` at the zip root.
6. Count passing tests and compute a score. Coverage is collected automatically via the injected fixture.

## Scoring
- Test plan present: 20 points.
- Bug report present: 10 points.
- Exploratory notes present: 10 points.
- Playwright tests: weighted to 60 points total (distributed across the number of tests you have).
- Coverage artifacts generated: 10 points.
- Total score capped at 100.
