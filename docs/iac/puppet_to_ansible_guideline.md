Here are two Markdown guideline files—one for Puppet→Ansible and one for Chef→Ansible. Drop each into your `docs/mappings/` folder (e.g. `docs/mappings/puppet_to_ansible_guideline.md` and `docs/mappings/chef_to_ansible_guideline.md`) and they’ll be ingested as-is.

---

````markdown
# Puppet → Ansible Conversion Guidelines

_Last updated: May 10, 2025_

## 1. Overview

This guide shows how to translate common Puppet resource types into equivalent Ansible tasks and playbook structure.

---

## 2. Resource Mapping

| Puppet Resource                   | Ansible Module / Syntax                                                     |
|-----------------------------------|------------------------------------------------------------------------------|
| `file { '/path': ensure=>directory }` | ```yaml<br>- ansible.builtin.file:<br>    path: /path<br>    state: directory``` |
| `package { 'name': ensure=>installed }` | ```yaml<br>- ansible.builtin.package:<br>    name: name<br>    state: present``` |
| `service { 'svc': ensure=>running }` | ```yaml<br>- ansible.builtin.service:<br>    name: svc<br>    state: started``` |
| `user { 'alice': ensure=>present }` | ```yaml<br>- ansible.builtin.user:<br>    name: alice<br>    state: present``` |
| `cron { 'job': command=>'/bin/true' }` | ```yaml<br>- ansible.builtin.cron:<br>    name: job<br>    job: '/bin/true'``` |

---

## 3. Example Conversion

```puppet
file { '/etc/myapp':
  ensure => directory,
  owner  => 'root',
  group  => 'root',
  mode   => '0755',
}

service { 'httpd':
  ensure => running,
  enable => true,
}
````

Becomes:

```yaml
- name: Ensure /etc/myapp exists
  ansible.builtin.file:
    path: /etc/myapp
    state: directory
    owner: root
    group: root
    mode: '0755'

- name: Ensure httpd is running and enabled
  ansible.builtin.service:
    name: httpd
    state: started
    enabled: yes
```

---

## 4. Layout & Structure

* **Group related tasks** under a single playbook with descriptive `name:` fields.

* Use variables for repeated values:

  ```yaml
  vars:
    app_path: /etc/myapp
  tasks:
    - name: Ensure directory exists
      ansible.builtin.file:
        path: "{{ app_path }}"
  ```

* Leverage **roles** for complex conversions (e.g. `roles/myapp/tasks/main.yml`).

---

## 5. Best Practices

* **Idempotency**: Map Puppet’s `ensure => latest` to `state: latest` in Ansible where supported.
* **Parameter naming**: Convert Puppet’s `owner => 'user'` to `owner: user` (YAML syntax).
* **Notify handlers**: Puppet’s `notify => Service['httpd']` becomes `notify: Restart httpd` in a handler.

---

*End of Puppet → Ansible guidelines.*

````

---

```markdown
# Chef → Ansible Conversion Guidelines

_Last updated: May 10, 2025_

## 1. Overview

Translate common Chef resources into Ansible modules and playbook patterns.

---

## 2. Resource Mapping

| Chef Resource                     | Ansible Module / Syntax                                                     |
|-----------------------------------|------------------------------------------------------------------------------|
| `package 'name' do action :install end` | ```yaml<br>- ansible.builtin.package:<br>    name: name<br>    state: present``` |
| `service 'svc' do action [:enable, :start] end` | ```yaml<br>- ansible.builtin.service:<br>    name: svc<br>    state: started<br>    enabled: yes``` |
| `user 'alice' do action :create end` | ```yaml<br>- ansible.builtin.user:<br>    name: alice<br>    state: present``` |
| `template '/etc/myapp.conf' do source 'myapp.conf.erb' end` | ```yaml<br>- ansible.builtin.template:<br>    src: myapp.conf.j2<br>    dest: /etc/myapp.conf``` |
| `cookbook_file '/usr/local/bin/tool' do source 'tool' end` | ```yaml<br>- ansible.builtin.copy:<br>    src: tool<br>    dest: /usr/local/bin/tool``` |

---

## 3. Example Conversion

```ruby
package 'nginx' do
  action :install
end

service 'nginx' do
  action [:enable, :start]
end
````

Becomes:

```yaml
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present

- name: Ensure nginx is enabled and running
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: yes
```

---

## 4. Playbook Organization

* **Variables**:

  ```yaml
  vars:
    service_name: nginx
  tasks:
    - name: Install service
      ansible.builtin.package:
        name: "{{ service_name }}"
  ```

* **Handlers**:

  ```yaml
  handlers:
    - name: restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
  ```

* Consider converting Chef’s **recipes** into Ansible **roles** for modularity.

---

## 5. Best Practices

* **Idempotency**: Match Chef’s `:create_if_missing` to Ansible’s `creates:` argument in `ansible.builtin.command` or use appropriate module.
* **File templates**: Rename `*.erb` to `*.j2` and update syntax (`<%= variable %>` → `{{ variable }}`).
* **Notifications**: Chef’s `notifies :restart, 'service[nginx]'` → `notify: restart nginx` in a handler.

---

*End of Chef → Ansible guidelines.*

```
```
