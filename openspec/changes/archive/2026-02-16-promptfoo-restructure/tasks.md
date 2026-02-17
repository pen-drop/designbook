## 1. Create directory structure

- [x] 1.1 Create `promptfoo/debo-design-screen/prompts/` directory
- [x] 1.2 Create `promptfoo/chat-eval/` directory
- [x] 1.3 Create `promptfoo/reports/` directory with `.gitkeep`

## 2. Create workflow configs

- [x] 2.1 Create `promptfoo/debo-design-screen/promptfooconfig.yaml` with exec provider and llm-rubric assertions
- [x] 2.2 Move `blog_prompt.txt` to `promptfoo/debo-design-screen/prompts/blog-spec.txt`
- [x] 2.3 Create `promptfoo/chat-eval/promptfooconfig.yaml` with opencode provider and llm-rubric assertions

## 3. Documentation

- [x] 3.1 Create `promptfoo/README.md` with usage instructions

## 4. Cleanup

- [x] 4.1 Delete `promptfooconfig.yaml` from root
- [x] 4.2 Delete `promptfoo-test-blog.yaml` from root
- [x] 4.3 Delete `blog_prompt.txt` from root
- [x] 4.4 Delete `verify_blog_spec.py` from root
- [x] 4.5 Delete `README_promptfoo.md` from root

## 5. Verification

- [x] 5.1 Verify `promptfoo eval -c promptfoo/chat-eval/promptfooconfig.yaml` runs — structure works, report written to `reports/chat-eval.json`. Provider needs API key config (expected).
