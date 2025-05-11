````markdown
# Team Ansible Style Guide

## File & Directory Layout

Maintain a clear project structure:

```text
playbooks/
  site.yml
  webservers.yml
roles/
  common/
    tasks/
      main.yml
    handlers/
      main.yml
    defaults/
      main.yml
    vars/
      main.yml
````

* **`playbooks/`**: Top-level playbooks that orchestrate roles.
* **`roles/`**: Each role encapsulates one area of responsibility.

## Naming Conventions

* **Playbooks**

  * Lowercase, underscore-separated, ending in `.yml` (e.g. `site.yml`, `deploy_webservers.yml`).
* **Roles**

  * Named for the service or function (e.g. `database`, `load_balancer`).
* **Tasks & Handlers**

  * Files named `main.yml` under each subdirectory (`tasks/`, `handlers/`, etc.).

## Task Formatting

* Always include a clear **`name:`** for each task.
* Use the fully-qualified module name (e.g. `ansible.builtin.file`).
* Keep lines under **120 characters**.
* Don’t mix tabs and spaces—use **two spaces** per indent level.

```yaml
- name: Ensure the /etc/myapp directory exists
  ansible.builtin.file:
    path: /etc/myapp
    state: directory
    owner: root
    group: root
    mode: '0755'
```

## Variables

* **Naming**: snake\_case (e.g. `db_user`, `http_port`).
* **Scope**:

  * Use **role defaults** for safe fallbacks (`roles/<role>/defaults/main.yml`).
  * Use **group\_vars** or **host\_vars** for environment-specific values.
* **Avoid** deep nesting; flatten when possible.

## Handlers

* Define handlers in `roles/<role>/handlers/main.yml`.
* Always name them in a way that describes the outcome, not the action.

```yaml
handlers:
  - name: Restart web service
    ansible.builtin.service:
      name: httpd
      state: restarted
```

## Idempotency & Error Handling

* Aim for idempotent tasks—running twice should not change the system a second time.
* Use `changed_when`, `failed_when`, and `retries`/`delay` for complex operations.

```yaml
- name: Check if service is active
  ansible.builtin.systemd:
    name: nginx
    state: started
  register: nginx_status
  changed_when: false
  failed_when: nginx_status.status.ActiveState != 'active'
```

## Linting & Testing

* Run **`ansible-lint`** on every playbook and role:

  ```bash
  ansible-lint playbooks/*.yml roles/**/tasks/*.yml
  ```
* Use **`yamllint`** to enforce YAML syntax and formatting.

## Security Best Practices

* **Vault secrets**: store sensitive data in `group_vars/vault.yml` encrypted with Ansible Vault.
* **Least privilege**: only escalate to `become: yes` when necessary.
* **SSH options**: set strict host key checking via inventory or config.

---

*Last updated: May 10, 2025*

```
```
