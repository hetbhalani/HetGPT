from langchain_core.tools import tool
from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage, SystemMessage
from langchain_ollama import ChatOllama
import requests
import os
import datetime
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace

model = HuggingFaceEndpoint(
    repo_id='moonshotai/Kimi-K2-Thinking',
    task='text-generation'
)

llm = ChatHuggingFace(llm=model)

load_dotenv()
OPENWEATHERMAP_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

# llm = ChatOllama(
#     model="qwen2.5:7b-instruct",
#     base_url="https://clark-spouse-belkin-started.trycloudflare.com/",
#     temperature=0,
# )

@tool
def what_the_duck(query: str):
    """Search DuckDuckGo for current, real-time information like weather, news, or latest events."""
    return DuckDuckGoSearchRun().invoke(query)

@tool
def wiki(query: str):
    """Query Wikipedia for historical facts, definitions, or stable information."""
    wiki_api = WikipediaAPIWrapper(top_k_results=2, doc_content_chars_max=500)
    return WikipediaQueryRun(api_wrapper=wiki_api).invoke(query) 

@tool
def weather(city: str):
    """Give the current weather conditions of given city by calling this API"""
    url = f'http://api.openweathermap.org/data/2.5/weather?q={city}&APPID={OPENWEATHERMAP_API_KEY}&units=metric'
    res = requests.get(url).json()
    # print(res)
    
    return res['main']

@tool
def news(topic: str):
    """Give the current NEWS of given topic by calling the API"""
    start_date = datetime.date.today() - datetime.timedelta(days=1)
    finish_date = datetime.date.today()
    url = f"https://newsapi.org/v2/everything?q={topic}&from={start_date}&to={finish_date}&sortBy=popularity&apiKey={NEWS_API_KEY}"

    return requests.get(url).json()
    
    
tools = [what_the_duck, wiki, weather, news]
llm_w_tools = llm.bind_tools(tools)

def process_query(query):
    messages = [
        SystemMessage(content="You are a helpful assistant. Use the available tools to answer questions. After using tools and getting results, provide a clear, natural language answer to the user. Do not make repeated tool calls with the same tool."),
        HumanMessage(content=query)
    ]    
    response = llm_w_tools.invoke(messages)
    messages.append(response)
    
    max_iterations = 5
    iteration = 0
    
    while hasattr(response, "tool_calls") and response.tool_calls and iteration < max_iterations:
        iteration += 1
        
        for tool_call in response.tool_calls:
            print(response)
            tool_name = tool_call["name"]
            args = tool_call["args"]
            tool_id = tool_call["id"]
            
            selected_tool = {"what_the_duck": what_the_duck, "wiki": wiki, "weather": weather, "news":news}.get(tool_name)
            
            if selected_tool:
                try:
                    tool_output = selected_tool.invoke(args)
                    
                    messages.append(
                        ToolMessage(
                            content=str(tool_output),
                            name=tool_name,
                            tool_call_id=tool_id
                        )
                    )
                except Exception as e:
                    messages.append(
                        ToolMessage(
                            content=f"Error: {str(e)}",
                            name=tool_name,
                            tool_call_id=tool_id
                        )
                    )
        
        response = llm_w_tools.invoke(messages)
        messages.append(response)
    
    return response.content

print(process_query("tell me top 5 news of india today"))