from fileio.settings import Settings
from fileio.file_handler import FileHandler
from ai_modules.ollama_explanator import Ollama
from ai_modules.wxai import WxAI
import os
import re

# app settings
settings = Settings()
upload_settings = settings.read_sections("settings.config", "files")
file_location = settings.getSettingValue(upload_settings, "file_location")
summary_location = settings.getSettingValue(upload_settings, "summary_location")

general_settings = settings.read_sections("settings.config", "general")
ai_to_use = settings.getSettingValue(general_settings, "ai_to_use")

if ai_to_use == "ollama":
    ai = Ollama()

if ai_to_use == "wxai":
    ai = WxAI()

# get directory listing from location specified
files = os.listdir(file_location)

# for each entry loop through
for file in files:
    # if not a file then go to the next item
    if not os.path.isfile(file_location + "/" + file) and (not file.endswith(".pp") or not file.endswith(".rb")):
        print("not a file: " + file_location  + file)
        continue
    else:
        print ("Processing file: " + file)
        with open(file_location + "/" + file, 'r') as readFile:
            content = readFile.read()

        if file.endswith(".pp"):
            playbook = ai.transform(content, "Puppet module")
        
        if file.endswith(".yml") or file.endswith(".rb"):
            playbook = ai.transform(content, "Chef Recipe")

        pattern = r"```yaml\n(.*?)\n```"
        match = re.search(pattern, playbook, re.DOTALL)

        if match: 
            playbook = match.group(1) 

        # write the results to output directory and move onto the next directory
        os.makedirs(summary_location, exist_ok=True)
        outputFile = open(summary_location + "/" + file + ".yaml", "w")
        print ("Writing file: " + summary_location + "/" + file + ".yaml")
        outputFile.write(playbook)
        outputFile.close()
