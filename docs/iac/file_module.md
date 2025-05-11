# Ansible `file` Module

The **file** module manages filesystem objects. It can create, remove, or modify files, directories, and symlinks.

## Parameters

- `path` (string, required)  
  Path to the file, directory, or symlink.

- `state` (string, choices: `file`, `directory`, `absent`, `touch`, `link`)  
  Desired state of the object.

- `owner` (string)  
  Name of the user that should own the file.

- `group` (string)  
  Name of the group that should own the file.

- `mode` (string)  
  Permissions to set, in symbolic (e.g. `u=rwx,g=rx,o=r`) or octal (e.g. `0755`) form.

## Examples

```yaml
- name: Ensure directory exists
  ansible.builtin.file:
    path: /etc/myapp
    state: directory
    owner: root
    group: root
    mode: '0755'

- name: Create an empty file
  ansible.builtin.file:
    path: /tmp/hello.txt
    state: touch
