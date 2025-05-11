````markdown
# Understanding Ansible’s `async` and `poll`

Ansible’s asynchronous actions let you fire-and-forget long-running tasks without blocking your playbook.

## Key Parameters

- **`async`** (integer)  
  Maximum number of seconds the task may run in the background before timing out.

- **`poll`** (integer)  
  How often (in seconds) to check on the status of the async task.  
  - `poll: 0` means “kick it off and don’t wait.”

## Basic Example

```yaml
- name: Run database backup in background
  shell: /usr/local/bin/backup.sh
  async: 3600   # allow up to 1 hour for completion
  poll: 0      # don’t wait—move on immediately
````

In this example, Ansible starts the backup script and immediately proceeds to the next task. The backup continues on the remote host for up to 1 hour.

## Checking Status

If you need to wait for or verify completion, use `async_status`:

```yaml
- name: Launch long-running job
  shell: /usr/local/bin/backup.sh
  async: 3600
  poll: 0
  register: backup_job

- name: Check backup status
  async_status:
    jid: "{{ backup_job.ansible_job_id }}"
  register: job_result
  until: job_result.finished
  retries: 30
  delay: 10
```

## Best Practices

* **Short poll intervals** (e.g. `poll: 10`) give quicker feedback without overwhelming the control machine.
* **Use `register` + `async_status`** when you need to gate later tasks on completion.
* **Handle failures** explicitly with `failed_when` or retries to avoid silent errors in background jobs.
* **Clean up** any orphaned processes or temporary files in case of timeouts.

---

*Last updated: May 10, 2025*

```
```
