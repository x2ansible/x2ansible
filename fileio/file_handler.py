import os
from .fileio import FileIO

class FileHandler(FileIO):

    def exists(self, filename):
        if os.path.exists(filename):
            return True
        else:
            return False
        
    def read_file(self, filename):
        if self.exists(filename):
             with open(filename, 'r') as file:
                return file.read()
        else:
            raise Exception("File " + filename + " does not exist")

    def write_file(self, filename, content):
        if not self.exists(filename):
            with open(self.file_path, 'w') as file:
                file.write(content)
        else:
            raise Exception("File " + filename + " already exists")

    def append_file(self, filename, content):
        with open(self.file_path, 'a') as file:
            file.write(content)