# ✅ Ansible Playbook Sanity Rules

These are enforced by the post-processing pipeline after LLM generation.

---

## 🧩 YAML Formatting & Structure

1. **Avoid block nesting unless necessary**
   - `block:` should be flattened unless logically needed (e.g. with `rescue` or `always`).
   - Prefer plain `tasks:` lists.

2. **Avoid duplicate play names or repeated task blocks**
   - Each play should have a unique `name:` and distinct `tasks`.

---

## 📦 Modules & Syntax Validity

3. **Do not use hallucinated modules**
   - Module names must match official Ansible modules (e.g., `apt`, `copy`, `service`).
   - Any unrecognized modules should be logged or discarded.

4. **Convert `with_items` to `loop`**
   - Modern syntax should use `loop:` instead of legacy `with_items:`.

---

## 🧱 Template & File Rules

5. **Avoid `.erb` templates**
   - Use `.j2` for all Jinja templates.
   - Convert `src: myfile.erb` → `src: myfile.j2`

6. **Do not use `lookup('template', ...)` inside `content:`**
   - Inline template lookups are not valid in `copy.content`.
   - Replace with `set_fact` or clean values.

7. **Move `template.variables` into task-level `vars:`**
   - Do not place `vars:` inside the `template:` block.

---

## 🔐 Secrets & Environment

8. **Avoid `vault_lookup` or `data_bag_item` in lookups**
   - Use environment variables instead: `{{ lookup('env', 'DB_PASSWORD') }}`.
   - Inject with `set_fact` if not present.

9. **Inject `set_fact` for secret variables if used in content**
   - Example: if `db_password` appears in content, ensure `set_fact` is defined first.

---

## ⚙️ Task Hygiene

10. **Remove unsupported keys**
    - Strip: `require`, `notify`, `become_password`, `create`, `not_if`, `subscribes`, `delay`, `flush_handlers`.

11. **Fix user module keys**
    - Convert `createhome: true` → `create_home: true`
    - Remove `create: true`

12. **Fix `changed_when: result.changed`**
    - Use `register:` and `when:` properly, or remove misleading `changed_when`.

---

## 🔁 Handlers

13. **Inject `Restart <service>` handlers if service tasks exist**
    - Every task using `service:` should have a corresponding `notify:` and handler.

14. **Remove invalid keys from handlers**
    - Handlers must not include `delay`, `when`, `flush_handlers`.

---

## ✅ Output Expectations

15. **Output must be valid YAML**
    - No markdown, no explanations, no comments outside YAML.
    - Must parse with `yaml.safe_load()`.

16. **Use descriptive task names**
    - Avoid vague names like “Run command” or “Do something”.

17. **Prefer idempotent Ansible modules over `command:` or `shell:`**
    - Use modules like `file`, `template`, `lineinfile`, `copy` when possible.
