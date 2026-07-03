import { useState } from 'react';
import { analyticsAPI } from '../api/analyticsAPI.js';
import { useI18n } from '../i18n.jsx';
import '../styles/ReviewQueue.css';

const MANUAL_REVIEW_STATUS = 'Manual Review Required';
const formatConfidence = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

function ReviewQueue({ sessionId, items = [], onChanged }) {
  const { t } = useI18n();
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');

  const approveSubmission = async (submissionId) => {
    setActingId(submissionId);
    setError('');

    try {
      await analyticsAPI.approveReviewSubmission(sessionId, submissionId);
      await onChanged?.();
    } catch (approvalError) {
      console.error('Failed to approve review submission:', approvalError);
      setError(approvalError.response?.data?.error || t('reviewApproveFailed'));
    } finally {
      setActingId(null);
    }
  };

  const dismissSubmission = async (submissionId) => {
    setActingId(submissionId);
    setError('');

    try {
      await analyticsAPI.dismissReviewSubmission(sessionId, submissionId);
      await onChanged?.();
    } catch (dismissError) {
      console.error('Failed to dismiss manual review submission:', dismissError);
      setError(dismissError.response?.data?.error || t('reviewDismissFailed'));
    } finally {
      setActingId(null);
    }
  };

  if (!items.length) {
    return (
      <section className="review-queue-empty">
        <span className="review-empty-mark">OK</span>
        <h2>{t('reviewQueueEmptyTitle')}</h2>
        <p>{t('reviewQueueEmptyBody')}</p>
      </section>
    );
  }

  return (
    <section className="review-queue-shell">
      <div className="review-queue-header">
        <div>
          <span className="review-queue-eyebrow">{t('humanInLoop')}</span>
          <h2>{t('reviewQueueTitle')}</h2>
          <p>{t('reviewQueueSubtitle')}</p>
        </div>
        <div className="review-queue-count">
          <strong>{items.length}</strong>
          <span>{t('needsReview')}</span>
        </div>
      </div>

      {error && <div className="review-queue-error">{error}</div>}

      <div className="review-queue-list">
        {items.map((item) => {
          const isManualReview = item.status === MANUAL_REVIEW_STATUS;
          const isBusy = actingId === item._id;

          return (
            <article
              className={`review-card ${isManualReview ? 'review-card-manual' : ''}`}
              key={item._id}
            >
              <div className="review-card-top">
                <div>
                  <span className="review-card-kicker">{t('student')}</span>
                  <h3>{item.studentName || t('unknown')}</h3>
                  <span className={`review-type-badge ${isManualReview ? 'manual' : 'teacher'}`}>
                    {isManualReview ? t('manualReviewBadge') : t('teacherReviewBadge')}
                  </span>
                </div>
                {!isManualReview && (
                  <div className="review-score">
                    <span>{t('tentativeScore')}</span>
                    <strong>{Math.round(Number(item.totalScore) || 0)}%</strong>
                  </div>
                )}
              </div>

              {!isManualReview && (
                <div className="review-metrics">
                  <div>
                    <span>{t('averageConfidence')}</span>
                    <strong>{formatConfidence(item.confidenceSummary?.averageConfidence)}</strong>
                  </div>
                  <div>
                    <span>{t('minimumConfidence')}</span>
                    <strong>{formatConfidence(item.confidenceSummary?.minimumConfidence)}</strong>
                  </div>
                  <div>
                    <span>{t('lowConfidenceQuestions')}</span>
                    <strong>{item.confidenceSummary?.lowConfidenceCount || 0}</strong>
                  </div>
                </div>
              )}

              <div className="review-reason">
                <span>{isManualReview ? t('manualReviewRate') : t('reviewReason')}</span>
                <p>{item.errorSummary || item.reviewReason || t('reviewReasonFallback')}</p>
              </div>

              {!isManualReview && (
                <>
                  <div className="review-question-list">
                    {(item.questionResults || []).map((question) => (
                      <div className="review-question" key={`${item._id}-${question.questionNumber}`}>
                        <div className="review-question-main">
                          <strong>{question.questionNumber}</strong>
                          <span>{question.concept || t('unknown')}</span>
                        </div>
                        <div className="review-question-confidence">
                          {formatConfidence(question.confidence)}
                        </div>
                        {question.evidence && (
                          <p>{question.evidence}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {item.mistakes?.length > 0 && (
                    <div className="review-mistakes">
                      <span>{t('flaggedMistakes')}</span>
                      <div>
                        {item.mistakes.map((mistake) => (
                          <mark key={`${item._id}-${mistake.questionNumber}-${mistake.conceptMissed}`}>
                            {mistake.questionNumber}: {mistake.conceptMissed}
                          </mark>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {isManualReview ? (
                <button
                  type="button"
                  className="review-dismiss-button"
                  onClick={() => dismissSubmission(item._id)}
                  disabled={isBusy}
                >
                  {isBusy ? t('dismissing') : t('dismissManualReview')}
                </button>
              ) : (
                <button
                  type="button"
                  className="review-approve-button"
                  onClick={() => approveSubmission(item._id)}
                  disabled={isBusy}
                >
                  {isBusy ? t('approving') : t('approveGrade')}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ReviewQueue;
