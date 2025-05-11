````markdown
# Chef → Ansible Conversion Guidelines

_Last updated: May 10, 2025_

## 1. Overview

Translate common Chef resources into equivalent Ansible modules and playbook constructs to maintain idempotency and readability.

---

## 2. Resource Mapping

| Chef Resource                                                       | Ansible Module / Syntax                                                       |
|---------------------------------------------------------------------|-------------------------------------------------------------------------------|
| `package 'name' do action :install end`                             | ```yaml<br>- name: Install name<br>  ansible.builtin.package:<br>      name: name<br>      state: present``` |
| `service 'svc' do action [:enable, :start] end`                     | ```yaml<br>- name: Ensure svc is enabled and running<br>  ansible.builtin.service:<br>      name: svc<br>      state: started<br>      enabled: yes``` |
| `user 'alice' do action :create end`                                | ```yaml<br>- name: Ensure alice exists<br>  ansible.builtin.user:<br>      name: alice<br>      state: present``` |
| `template '/etc/app.conf' do source 'app.conf.erb' end`             | ```yaml<br>- name: Deploy template for app.conf<br>  ansible.builtin.template:<br>      src: app.conf.j2<br>      dest: /etc/app.conf``` |
| `cookbook_file '/usr/local/bin/tool' do source 'tool' end`          | ```yaml<br>- name: Copy tool executable<br>  ansible.builtin.copy:<br>      src: tool<br>      dest: /usr/local/bin/tool``` |
| `ruby_block 'custom action' do block { ... } end`                   | ```yaml<br>- name: Execute custom Ruby action<br>  ansible.builtin.command:<br>      cmd: /usr/local/bin/custom_script.sh``` |

---

## 3. Example Conversion

Chef recipe:

```ruby
package 'nginx' do
  action :install
end

service 'nginx' do
  action [:enable, :start]
end

template '/etc/nginx/nginx.conf' do
  source 'nginx.conf.erb'
  notifies :reload, 'service[nginx]'
end
````

Becomes Ansible tasks:

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

- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Reload nginx

handlers:
  - name: Reload nginx
    ansible.builtin.service:
      name: nginx
      state: reloaded
```

---

## 4. Playbook & Role Structure

* **Variables**:

  ```yaml
  vars:
    web_service: nginx
  tasks:
    - name: Install service
      ansible.builtin.package:
        name: "{{ web_service }}"
        state: present
  ```
* **Handlers**:

  ```yaml
  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
  ```
* **Roles**:
  Convert complex recipes into roles:

  ```
  roles/
    webserver/
      tasks/main.yml
      handlers/main.yml
      templates/
        nginx.conf.j2
      defaults/main.yml
  ```

---

## 5. Best Practices

* **Idempotency**: Use modules over raw commands whenever possible.
* **Template syntax**: Rename `.erb` to `.j2` and convert `<%= var %>` to `{{ var }}`.
* **Notifications**: Map Chef’s `notifies` and `subscribes` to Ansible’s `notify` and `listen`.
* **Error handling**: Use `register`, `failed_when`, and retry loops for robust playbooks.
* **Consistency**: Follow your team’s Ansible style guide for naming, indentation (2 spaces), and module prefixes (`ansible.builtin.`).

---

*End of Chef → Ansible guidelines.*

```
```
