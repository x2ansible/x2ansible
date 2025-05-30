# Chef to Ansible Conversion Pattern

## Overview

This document outlines a general pattern for converting Chef cookbooks and recipes into Ansible playbooks, roles, and tasks. It focuses on conceptual mapping and common conversion scenarios rather than a prescriptive, line-by-line translation. This pattern is designed to be ingestible by a vector database for efficient retrieval and pattern matching.

## Metadata

* **Source System:** Chef
* **Target System:** Ansible
* **Conversion Type:** Configuration Management System Migration
* **Key Concepts:** Idempotency, Desired State, Infrastructure as Code (IaC)

## Core Conversion Principles

1.  **Desired State Mapping:** Both Chef and Ansible operate on the principle of desired state. Identify the target state defined in Chef resources and express it using equivalent Ansible modules and tasks.
2.  **Resource to Module Mapping:** The primary conversion involves mapping Chef resources (e.g., `package`, `service`, `file`, `template`, `execute`) to their corresponding Ansible modules.
3.  **Role/Cookbook to Role Mapping:** Chef cookbooks often represent a logical grouping of functionality. These typically translate directly to Ansible roles.
4.  **Recipe to Task Mapping:** Chef recipes define a sequence of actions. These translate to a series of tasks within an Ansible playbook or role.
5.  **Attributes to Variables:** Chef attributes (node attributes, cookbook attributes) map to Ansible variables (group vars, host vars, role vars, extra vars).
6.  **Templates:** Chef templates (`.erb`) translate to Ansible templates (`.j2`).
7.  **Files:** Chef `cookbook_file` and `remote_file` resources map to the Ansible `copy` and `get_url` modules, respectively.
8.  **Services:** Chef `service` resources map directly to the Ansible `service` module.
9.  **Packages:** Chef `package` resources map directly to the Ansible `package` module (or distribution-specific modules like `apt`, `yum`).
10. **Users/Groups:** Chef `user` and `group` resources map directly to the Ansible `user` and `group` modules.
11. **Execute/Script:** Chef `execute` and `script` resources translate to the Ansible `command`, `shell`, or `raw` modules. Use these sparingly and only when a dedicated Ansible module doesn't exist.
12. **Handlers/Notifications:** Chef `notifies` and `subscribes` translate to Ansible handlers. Handlers are triggered by tasks when a change occurs.
13. **Data Bags to Lookup Plugins/Vault:** Chef data bags can be migrated to Ansible lookup plugins (e.g., `file`, `ini`, `json`, `csv`) or Ansible Vault for sensitive data.
14. **Custom Resources/LWRPs:** Custom Chef resources or LWRPs will require custom Ansible modules or careful orchestration using `command`/`shell` modules, or by leveraging Ansible's extensibility.
15. **Conditional Logic:** Chef `if`/`else` statements and `only_if`/`not_if` guards translate to Ansible `when` conditions.

## Common Conversion Scenarios & Patterns

### 1. Package Installation

* **Chef:**
    ```ruby
    package 'nginx' do
      action :install
    end
    ```
* **Ansible:**
    ```yaml
    - name: Install nginx
      ansible.builtin.package:
        name: nginx
        state: present
    ```

### 2. Service Management

* **Chef:**
    ```ruby
    service 'nginx' do
      action [:enable, :start]
    end
    ```
* **Ansible:**
    ```yaml
    - name: Ensure nginx service is running and enabled
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
    ```

### 3. File Management

* **Chef (cookbook_file):**
    ```ruby
    cookbook_file '/etc/myconfig.conf' do
      source 'myconfig.conf'
      owner 'root'
      group 'root'
      mode '0644'
    end
    ```
* **Ansible:**
    ```yaml
    - name: Copy myconfig.conf
      ansible.builtin.copy:
        src: myconfig.conf
        dest: /etc/myconfig.conf
        owner: root
        group: root
        mode: '0644'
    ```

### 4. Template Generation

* **Chef:**
    ```ruby
    template '/etc/nginx/nginx.conf' do
      source 'nginx.conf.erb'
      variables(
        port: node['nginx']['port']
      )
      notifies :restart, 'service[nginx]'
    end
    ```
* **Ansible:**
    ```yaml
    - name: Configure nginx.conf
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: '0644'
      notify: Restart nginx

    # handlers/main.yml
    - name: Restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
    ```

### 5. Executing Commands

* **Chef:**
    ```ruby
    execute 'update_database' do
      command '/usr/bin/my_db_script.sh'
      only_if { File.exist?('/tmp/db_needs_update') }
    end
    ```
* **Ansible:**
    ```yaml
    - name: Run database update script
      ansible.builtin.command: /usr/bin/my_db_script.sh
      when: ansible.builtin.stat('/tmp/db_needs_update').stat.exists
    ```

### 6. User and Group Management

* **Chef (User):**
    ```ruby
    user 'appuser' do
      home '/home/appuser'
      shell '/bin/bash'
      password '$6$rounds=40000$....' # Example, avoid hardcoding passwords
    end
    ```
* **Ansible (User):**
    ```yaml
    - name: Create appuser
      ansible.builtin.user:
        name: appuser
        home: /home/appuser
        shell: /bin/bash
        password: "{{ 'your_hashed_password' }}" # Use Ansible Vault for sensitive data
    ```

### 7. Conditional Logic

* **Chef (if/else):**
    ```ruby
    if node['platform'] == 'ubuntu'
      package 'apache2'
    else
      package 'httpd'
    end
    ```
* **Ansible (when):**
    ```yaml
    - name: Install Apache on Ubuntu
      ansible.builtin.package:
        name: apache2
      when: ansible_os_family == 'Debian'

    - name: Install HTTPD on RHEL/CentOS
      ansible.builtin.package:
        name: httpd
      when: ansible_os_family == 'RedHat'
    ```

## Step-by-Step Conversion Process

1.  **Inventory Chef Cookbooks/Recipes:** Understand the scope and dependencies.
2.  **Map to Ansible Roles/Playbooks:** Determine the logical structure in Ansible. Each Chef cookbook often becomes an Ansible role. A collection of roles forms a playbook.
3.  **Identify Resources:** Go through each Chef recipe and list the resources being used.
4.  **Find Ansible Equivalents:** Map each Chef resource to its corresponding Ansible module.
5.  **Translate Attributes to Variables:** Convert Chef node attributes, cookbook attributes, and data bag items into Ansible variables (group_vars, host_vars, role_vars, vault).
6.  **Convert Templates:** Port `.erb` templates to `.j2` with appropriate variable mapping.
7.  **Handle Custom Resources/Libraries:** This is often the most challenging part. Consider creating custom Ansible modules, using `command`/`shell`, or refactoring.
8.  **Implement Handlers:** Translate Chef `notifies` and `subscribes` into Ansible handlers.
9.  **Refactor and Organize:** Organize Ansible tasks into logical roles, and roles into playbooks.
10. **Testing:** Thoroughly test the converted Ansible playbooks in a development environment.
11. **Idempotency Verification:** Ensure the Ansible playbooks are idempotent (running them multiple times yields the same result without unintended side effects).

## Considerations and Best Practices

* **Start Small:** Begin by converting smaller, less complex cookbooks or recipes.
* **Modularization:** Break down large Chef recipes into smaller, more manageable Ansible tasks and roles.
* **Leverage Ansible Galaxy:** Check for existing Ansible roles that provide similar functionality before writing your own.
* **Use Ansible Vault:** Securely manage sensitive data like passwords and API keys.
* **Variables:** Define variables clearly and use them consistently. Prioritize variable specificity (e.g., host_vars > group_vars > role_vars).
* **Idempotency:** Always strive for idempotent tasks.
* **Error Handling:** Implement `failed_when` and `ignore_errors` as needed.
* **Tagging:** Use tags to selectively run or skip parts of a playbook.
* **Version Control:** Store your Ansible content in a version control system (e.g., Git).
* **Continuous Integration/Deployment (CI/CD):** Integrate Ansible into your CI/CD pipeline for automated testing and deployment.
* **Documentation:** Document your Ansible roles and playbooks for future maintainability.

## Example Conversion Flow (Conceptual)

```mermaid
graph TD
    A[Chef Cookbook] --> B{Identify Recipes};
    B --> C{Identify Resources per Recipe};
    C --> D{Map Resources to Ansible Modules};
    D --> E{Map Attributes to Variables};
    E --> F{Convert Templates};
    F --> G{Handle Custom Resources};
    G --> H{Create Ansible Roles};
    H --> I{Create Ansible Playbooks};
    I --> J{Test and Refine};
    J --> K[Ansible Playbook/Role];