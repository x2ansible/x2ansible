"""Read and Write to the Setting file"""

import os
import configparser
from .fileio import FileIO

class Settings(FileIO):

    def write_file(filename, data): 
        pass

    def exists(self, filename):
        if os.path.exists(filename):
            return True
        else:
            return False

    def read_file(self, filename):
        pass

    def read_sections(self, file, section):
        if (self.exists(file)):
            config = configparser.ConfigParser()
            config.read(file)
            return [[key, value] for key, value in config[section].items()]
        else:
            raise Exception("Configuration file " + file + " does not exist")
    
    def getSettingValue(self, list, value):
        return next(x for x in list if value in x)[1]
