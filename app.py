import streamlit as st
import requests
import matplotlib.pyplot as plt
import seaborn as sns

API_URL = "http://localhost:8000/predict"

st.set_page_config(page_title="Sentiment Analysis Dashboard", page_icon="💬")
st.title("💬 Sentiment Analysis Dashboard")
st.markdown("Analyze the sentiment of any text using a trained ML model.")

# Single text input
st.subheader("Single Text Analysis")
text_input = st.text_area("Enter text to analyze", height=150)

if st.button("Analyze"):
    if text_input.strip():
        try:
            response = requests.post(API_URL, json={"text": text_input})
            result = response.json()
            label = result["label"]
            confidence = result["confidence"]

            color = "green" if label == "pos" else "red"
            emoji = "😊" if label == "pos" else "😞"
            st.markdown(
                f"**Sentiment:** :{color}[{emoji} {'Positive' if label == 'pos' else 'Negative'}]"
            )
            st.metric("Confidence", f"{confidence}%")

            # Confidence bar chart
            fig, ax = plt.subplots(figsize=(4, 2))
            sns.barplot(x=["Confidence"], y=[confidence], palette=["green" if label == "pos" else "red"], ax=ax)
            ax.set_ylim(0, 100)
            ax.set_ylabel("Score (%)")
            st.pyplot(fig)

        except Exception as e:
            st.error(f"API Error: {e}. Make sure FastAPI is running on port 8000.")
    else:
        st.warning("Please enter some text.")

# Batch analysis
st.subheader("Batch Text Analysis")
batch_input = st.text_area("Enter multiple texts (one per line)", height=150)

if st.button("Analyze Batch"):
    lines = [l.strip() for l in batch_input.strip().split("\n") if l.strip()]
    if lines:
        results = []
        for line in lines:
            try:
                response = requests.post(API_URL, json={"text": line})
                r = response.json()
                results.append({
                    "Text": line[:60] + "..." if len(line) > 60 else line,
                    "Sentiment": "Positive" if r["label"] == "pos" else "Negative",
                    "Confidence (%)": r["confidence"]
                })
            except:
                results.append({"Text": line[:60], "Sentiment": "Error", "Confidence (%)": 0})

        import pandas as pd
        df = st.dataframe(pd.DataFrame(results), use_container_width=True)

        # Distribution chart
        sentiments = [r["Sentiment"] for r in results]
        fig2, ax2 = plt.subplots()
        sns.countplot(x=sentiments, palette={"Positive": "green", "Negative": "red"}, ax=ax2)
        ax2.set_title("Sentiment Distribution")
        st.pyplot(fig2)
    else:
        st.warning("Please enter at least one line.")
