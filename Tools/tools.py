from langchain_core.tools import tool
from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
import os
import datetime
import requests

load_dotenv()
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

class Tools:
    @staticmethod
    @tool
    def what_the_duck(query: str):
        """Search DuckDuckGo for current, real-time information like weather, news, or latest events."""
        return DuckDuckGoSearchRun().invoke(query)
    
    @staticmethod
    @tool
    def wiki(query: str):
        """Query Wikipedia for historical facts, definitions, or stable information."""
        wiki_api = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=500)
        return WikipediaQueryRun(api_wrapper=wiki_api).invoke(query) 
    
    @staticmethod
    @tool
    def weather(city: str):
        """Give the current weather conditions of given city by calling this API"""
        if not OPENWEATHERMAP_API_KEY:
            return {"error": "OPENWEATHERMAP_API_KEY is not configured"}

        url = f'http://api.openweathermap.org/data/2.5/weather?q={city}&APPID={OPENWEATHERMAP_API_KEY}&units=metric'
        res = requests.get(url, timeout=15)
        data = res.json()

        if res.status_code != 200:
            return {"error": data.get("message", "Failed to fetch weather")}

        return data.get('main', {"error": "Weather data unavailable"})

    @staticmethod
    @tool
    def news(topic: str):
        """Give the current NEWS of given topic by calling the API"""
        if not NEWS_API_KEY:
            return {"error": "NEWS_API_KEY is not configured"}

        start_date = datetime.date.today() - datetime.timedelta(days=1)
        finish_date = datetime.date.today()
        url = f"https://newsapi.org/v2/everything?q={topic}&from={start_date}&to={finish_date}&sortBy=popularity&apiKey={NEWS_API_KEY}"

        try:
            return requests.get(url, timeout=15).json()
        except requests.RequestException as e:
            return {"error": f"News API request failed: {str(e)}"}