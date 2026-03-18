from .tools import Tools
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage, SystemMessage
from langchain_ollama import ChatOllama
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_groq import ChatGroq
import logging
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = (os.getenv("GROQ_API_KEY") or "").strip()

# model = HuggingFaceEndpoint(
#     repo_id='moonshotai/Kimi-K2-Thinking',
#     task='text-generation'
# )

# llm = ChatHuggingFace(llm=model)
if GROQ_API_KEY:
    llm = ChatGroq(model="moonshotai/kimi-k2-instruct-0905", api_key=GROQ_API_KEY)
else:
    llm = ChatGroq(model="moonshotai/kimi-k2-instruct-0905")

    
tools = [Tools.what_the_duck, Tools.wiki, Tools.weather, Tools.news]
llm_w_tools = llm.bind_tools(tools)


def _invoke_with_tools(messages):
    try:
        return llm_w_tools.invoke(messages)
    except Exception as e:
        logging.exception(f"Tool LLM invocation failed: {e}")
        return None

def tool_call(query, history: list = None):
    if history:
        messages = list(history)
        if messages and hasattr(messages[0], 'content'):
            messages[0] = SystemMessage(content="You are a helpful assistant. Use the available tools to answer questions. After using tools and getting results, provide a clear, natural language answer to the user. Do not make repeated tool calls with the same tool.")
    else:
        messages = [
            SystemMessage(content="You are a helpful assistant. Use the available tools to answer questions. After using tools and getting results, provide a clear, natural language answer to the user. Do not make repeated tool calls with the same tool."),
        ]    
        messages.append(HumanMessage(content=query))
    
    response = _invoke_with_tools(messages)
    if response is None:
        return "I could not reach the tools provider right now. Please try again in a moment."

    messages.append(response)
    
    max_iterations = 5
    iteration = 0
    
    while hasattr(response, "tool_calls") and response.tool_calls and iteration < max_iterations:
        iteration += 1
        
        for tool_call in response.tool_calls:
            tool_name = tool_call["name"]
            args = tool_call["args"]
            tool_id = tool_call["id"]
            
            selected_tool = {
                "what_the_duck": Tools.what_the_duck,
                "wiki": Tools.wiki,
                "weather": Tools.weather,
                "news":Tools.news
            }.get(tool_name)
            
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
                    logging.exception(f"Tool execution failed for {tool_name}: {e}")
                    messages.append(
                        ToolMessage(
                            content=f"Error: {str(e)}",
                            name=tool_name,
                            tool_call_id=tool_id
                        )
                    )
        
        response = _invoke_with_tools(messages)
        if response is None:
            return "I had a temporary connection issue while processing tools. Please try again."

        messages.append(response)
    
    return response.content

# print(process_query("weather in kashmir"))   