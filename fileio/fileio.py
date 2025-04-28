"""Interface module for File IO"""
import os
from abc import ABC, abstractmethod

class FileIO(ABC):
    @abstractmethod
    def read_file(self, filename):
        pass

    @abstractmethod
    def write_file(self, filename, data):
        pass

    @abstractmethod
    def exists(self, filename):
        pass