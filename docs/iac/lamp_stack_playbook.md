# LAMP Stack Example Playbook

```yaml
---
- name: Install and configure LAMP stack
  hosts: webservers
  become: yes

  vars:
    db_name: mydb

  tasks:
    - name: Install Apache and PHP
      package:
        name:
          - httpd
          - php
        state: present

    - name: Start and enable Apache
      service:
        name: httpd
        state: started
        enabled: yes

    - name: Install MySQL server
      package:
        name: mariadb-server
        state: present

    - name: Start and enable MySQL
      service:
        name: mariadb
        state: started
        enabled: yes

    - name: Create application database
      mysql_db:
        name: "{{ db_name }}"
        state: present
