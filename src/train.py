import nltk
import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from src.preprocess import clean_text

nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)


def load_data():
    # Using NLTK movie_reviews as sample dataset
    from nltk.corpus import movie_reviews
    nltk.download("movie_reviews", quiet=True)
    docs = [
        (movie_reviews.raw(fileid), category)
        for category in movie_reviews.categories()
        for fileid in movie_reviews.fileids(category)
    ]
    df = pd.DataFrame(docs, columns=["text", "label"])
    return df


def train():
    df = load_data()
    df["text"] = df["text"].apply(clean_text)

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=0.2, random_state=42
    )

    vectorizer = TfidfVectorizer(max_features=5000)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train_vec, y_train)

    y_pred = model.predict(X_test_vec)
    print(classification_report(y_test, y_pred))

    pickle.dump(model, open("models/model.pkl", "wb"))
    pickle.dump(vectorizer, open("models/vectorizer.pkl", "wb"))
    print("Model saved to models/")


if __name__ == "__main__":
    train()
