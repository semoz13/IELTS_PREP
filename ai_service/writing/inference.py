import os
from pathlib import Path
import torch
import torch.nn as nn
from transformers import DistilBertModel, DistilBertTokenizer

# Model .pt files stay in their original location.
# Override with env vars if you place them elsewhere.
_ROY_DIR   = Path(__file__).parent.parent.parent / "AI" / "roy model" / "Writing" / "Writing" / "ielts_project"
TASK1_PATH = os.getenv("TASK1_MODEL_PATH", str(_ROY_DIR / "task1_model_best.pt"))
TASK2_PATH = os.getenv("TASK2_MODEL_PATH", str(_ROY_DIR / "task2_model_best.pt"))

# ── Model definition (must match exactly what you trained) ───────────────────
class IELTSScorer(nn.Module):
    def __init__(self):
        super(IELTSScorer, self).__init__()
        self.distilbert = DistilBertModel.from_pretrained('distilbert-base-uncased')
        self.dropout = nn.Dropout(0.3)
        self.scorer = nn.Linear(768, 5)
        self.sigmoid = nn.Sigmoid()

    def forward(self, input_ids, attention_mask):
        outputs = self.distilbert(
            input_ids=input_ids,
            attention_mask=attention_mask
        )
        cls_output = outputs.last_hidden_state[:, 0, :]
        cls_output = self.dropout(cls_output)
        scores = self.sigmoid(self.scorer(cls_output))
        return scores


# ── Load tokenizer & models ───────────────────────────────────────────────────
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')

task1_model = IELTSScorer().to(device)
task2_model = IELTSScorer().to(device)

def load_models(task1_path: str = TASK1_PATH,
                task2_path: str = TASK2_PATH):
    task1_model.load_state_dict(torch.load(task1_path, map_location=device))
    task1_model.eval()
    task2_model.load_state_dict(torch.load(task2_path, map_location=device))
    task2_model.eval()
    print("✅ Task 1 model loaded!")
    print("✅ Task 2 model loaded!")


# ── Predict scores ────────────────────────────────────────────────────────────
def predict_scores(essay: str, task_type: str = "task1") -> dict:
    model = task1_model if task_type == "task1" else task2_model

    encoding = tokenizer(
        essay,
        max_length=512,
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )

    input_ids      = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)

    with torch.no_grad():
        outputs = model(input_ids, attention_mask)

    # Convert from 0-1 back to 0-9 scale, round to nearest 0.5
    scores = outputs.cpu().numpy()[0] * 9
    scores = [round(s * 2) / 2 for s in scores]

    return {
        "task_achievement":   scores[0],
        "coherence_cohesion": scores[1],
        "lexical_resource":   scores[2],
        "grammar":            scores[3],
        "overall":            scores[4]
    }


# ── Quick test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    load_models()

    test_essay = """
    In contemporary society, technology plays a pivotal role in our daily lives,
    and opinions about its impact are divided. Some people believe that technology
    has improved our lives greatly, while others argue it has made us less social.
    In my opinion, the advantages outweigh the disadvantages.
    Technology has revolutionized communication. We can now connect with people
    around the world instantly. However, some people spend too much time on phones.
    In conclusion, we should use technology wisely to maximize its benefits.
    """

    print("\n=== Task 2 Scores ===")
    scores = predict_scores(test_essay, task_type="task2")
    for key, value in scores.items():
        print(f"  {key}: {value}")

    print("\n=== Task 1 Scores ===")
    scores = predict_scores(test_essay, task_type="task1")
    for key, value in scores.items():
        print(f"  {key}: {value}")