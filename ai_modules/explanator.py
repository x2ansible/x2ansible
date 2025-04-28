# Assisted by WCA@IBM
# Latest GenAI contribution: ibm/granite-8b-code-instruct
from abc import ABC, abstractmethod
class Explanator(ABC):
    """
    A class for generating explanations for code.

    Attributes:
        model_name (str): The name of the model being used.
        code_data (str): The code data to be explained.

    Methods:
        who_am_i(): Prints a message identifying the model.
        greet(): Calls the who_am_i() method.
        generate_explanation(): Generates an explanation for the code data.
    """
    @abstractmethod
    def who_am_i(self):
        pass
#        print(f"Hello, I'm {self.model_name}! I will be used to generate explanation for your code")
    
    @abstractmethod
    def greet(self):
        self.who_am_i()

    @abstractmethod
    def transform(self, context):
        self.who_am_i()
#        print(f"Generating summary from explanations")

    @abstractmethod
    def handle_general_requst(self):
        self.who_am_i()