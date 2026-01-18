import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import './FAQ.css';

const faqData = [
  {
    question: "What is SpyPry?",
    answer: "SpyPry is a service that helps you discover and manage your online accounts by scanning your email inbox for account signup confirmations."
  },
  {
    question: "Do you read my emails?",
    answer: "We only scan your emails in read-only mode to identify account signups. We never send, delete, or modify any emails."
  },
  {
    question: "How does SpyPry find my accounts?",
    answer: "We search for common patterns in your email inbox, such as welcome emails, account confirmations, and receipts from various services."
  },
  {
    question: "Is this list complete?",
    answer: "The list shows accounts we've identified with high, medium, or low confidence based on email patterns. Some accounts may not be detected if they don't send confirmation emails."
  },
  {
    question: "What email access does SpyPry request?",
    answer: "SpyPry requests read-only access to your Gmail inbox. This allows us to scan for account-related emails but prevents us from making any changes."
  },
  {
    question: "Do you store my emails or data?",
    answer: "No, we do not store your emails or personal data. We only process emails temporarily to identify accounts and then discard the data."
  },
  {
    question: "Can SpyPry send emails to companies for me?",
    answer: "SpyPry can help you generate opt-out letters, but you maintain full control and can review everything before sending."
  },
  {
    question: "Which privacy laws does this help with?",
    answer: "SpyPry helps you exercise your rights under GDPR, CCPA, and other privacy regulations by identifying where your data may be stored."
  }
];

export default function FAQ() {
  return (
    <div className="faq-page">
      <TopNav variant="app" />
      <main className="faq-main">
        <h1 className="faq-title">Frequently Asked Questions</h1>
        <div className="faq-list">
          {faqData.map((item, index) => (
            <div key={index} className="faq-item">
              <h2 className="faq-question">
                {index + 1}. {item.question}
              </h2>
              <p className="faq-answer">{item.answer}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
