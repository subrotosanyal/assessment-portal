# QA Engineer Assignment

## Problem
You will test a small cancer tissue analysis portal UI that we provide in the grader. Your job is to write a test plan and Playwright tests that validate the behavior of the portal.

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
testplan.md
tests/
  portal.spec.ts
  sample-data/
    valid.jpg
    not-image.txt
```
Notes:
- Your tests must navigate to http://localhost:8085/.
- Use Playwright test runner.

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
5. Count passing tests and compute a score. It will also check for presence of testplan.md.

## Scoring
- Presence of testplan.md: 20 points.
- Playwright tests: each passing test is worth 10 points. Up to 8 tests counted.
- Total score capped at 100.
