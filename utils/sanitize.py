import yaml
import logging
import hashlib
import re

def remove_code_fences(text):
    return re.sub(r"^```(?:yaml|yml)?\s*|```$", "", text.strip(), flags=re.MULTILINE)

def hash_play(play):
    play_str = yaml.safe_dump(play, sort_keys=True)
    return hashlib.sha256(play_str.encode("utf-8")).hexdigest()

def flatten_blocks(yaml_text):
    try:
        data = yaml.safe_load(remove_code_fences(yaml_text))
        for play in data:
            if "tasks" in play:
                play["tasks"] = _flatten(play["tasks"])
        return yaml.safe_dump(data, sort_keys=False, default_style=None)
    except Exception as e:
        logging.warning(f"[flatten_blocks] failed: {e}")
        return yaml_text

def _flatten(tasks):
    flat = []
    for task in tasks:
        if isinstance(task, dict) and "block" in task:
            flat.extend(_flatten(task["block"]))
        else:
            flat.append(task)
    return flat

def sanitize_yaml(yaml_text, auto_add_handlers=True, dedupe_tasks=False):
    try:
        parsed = yaml.safe_load(remove_code_fences(yaml_text))
        if not isinstance(parsed, list):
            raise ValueError("Expected a list of plays")

        valid_modules = {
            "apt", "yum", "dnf", "package", "pip", "user", "group", "file", "copy", "template",
            "lineinfile", "blockinfile", "service", "systemd", "command", "shell", "stat",
            "set_fact", "include", "include_tasks", "import_tasks", "import_playbook", "uri"
        }

        seen_plays = set()
        cleaned_plays = []

        for play in parsed:
            if not isinstance(play, dict):
                continue

            play_hash = hash_play(play)
            if play_hash in seen_plays:
                continue
            seen_plays.add(play_hash)

            tasks = play.get("tasks", [])
            new_tasks = []
            seen_task_names = set()
            service_names = set()
            needs_db_fact = False

            if "vars" in play:
                for var, val in play.pop("vars", {}).items():
                    if "vault_lookup" in str(val) or "data_bag" in str(val):
                        new_tasks.append({
                            "name": f"Set {var} from env",
                            "set_fact": {
                                var: f"{{{{ lookup('env', '{var.upper()}') }}}}"
                            },
                            "when": f"{var} is not defined"
                        })

            for task in tasks:
                if not isinstance(task, dict):
                    continue

                name = task.get("name", "<unnamed>")
                logging.debug(f"[sanitize] Processing task: {name}")
                if dedupe_tasks and name in seen_task_names:
                    continue
                seen_task_names.add(name)

                # Detect unknown modules
                module_keys = set(task.keys()) - {
                    "name", "when", "loop", "register", "changed_when", "vars", "tags", "notify"
                }
                for mod in module_keys:
                    if mod not in valid_modules:
                        logging.warning(f"[sanitize] ⚠️ Unknown module '{mod}' in task: {name}")

                if "service" in task and isinstance(task["service"], dict):
                    svc = task["service"].get("name")
                    if svc:
                        service_names.add(svc)

                if "copy" in task and "content" in task["copy"]:
                    if "db_password" in task["copy"]["content"]:
                        needs_db_fact = True

                for key in ["require", "notify", "become_password", "create", "not_if", "subscribes"]:
                    task.pop(key, None)

                if "user" in task:
                    user = task["user"]
                    if isinstance(user, dict):
                        user.pop("create", None)
                        if "createhome" in user:
                            user["create_home"] = user.pop("createhome")

                for mod in ["template", "copy"]:
                    if mod in task:
                        block = task[mod]
                        if "src" in block and ".erb" in block["src"]:
                            block["src"] = block["src"].replace(".erb", ".j2")
                        if "content" in block and "lookup('template'" in block["content"]:
                            block["content"] = "# Replaced invalid template lookup"
                        if "variables" in block:
                            task["vars"] = block.pop("variables")

                task_str = yaml.dump(task)
                if "vault_lookup" in task_str or "data_bag" in task_str:
                    task.clear()
                    task["set_fact"] = {
                        "db_password": "{{ lookup('env', 'DB_PASSWORD') }}"
                    }

                if "with_items" in task:
                    task["loop"] = task.pop("with_items")

                task_yaml = yaml.dump(task)
                task_yaml = task_yaml.replace("node['myapp']['db_host']", "myapp_db_host")
                task_yaml = task_yaml.replace("node['myapp']['db_user']", "myapp_db_user")
                task = yaml.safe_load(task_yaml)

                if task.get("changed_when") == "result.changed":
                    del task["changed_when"]

                new_tasks.append(task)

            if needs_db_fact:
                new_tasks.insert(0, {
                    "name": "Set db_password from env",
                    "set_fact": {
                        "db_password": "{{ lookup('env', 'DB_PASSWORD') }}"
                    },
                    "when": "db_password is not defined"
                })

            play["tasks"] = new_tasks

            existing = {h.get("name") for h in play.get("handlers", [])}
            play["handlers"] = [
                {**h, "delay": None, "when": None, "flush_handlers": None}
                for h in play.get("handlers", [])
                if isinstance(h, dict)
            ]

            if auto_add_handlers:
                for svc in sorted(service_names):
                    hname = f"Restart {svc}"
                    if hname not in existing:
                        play["handlers"].append({
                            "name": hname,
                            "service": {
                                "name": svc,
                                "state": "restarted"
                            }
                        })

            cleaned_plays.append(play)

        return yaml.safe_dump(cleaned_plays, sort_keys=False, default_style=None, default_flow_style=False)

    except Exception as e:
        logging.warning(f"[sanitize_yaml] failed: {e}")
        return yaml_text
