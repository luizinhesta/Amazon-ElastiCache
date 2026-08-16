import { RankingEntry } from '../../../types';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import styles from './Ranking.module.css';

interface RankingProps {
  entries: RankingEntry[];
  currentPlayerSub?: string;
  isLoading: boolean;
}

export function Ranking({ entries, currentPlayerSub, isLoading }: RankingProps) {
  if (isLoading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Ranking Top 10</h3>
        <div className={styles.loadingWrapper}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Ranking Top 10</h3>

      {entries.length === 0 ? (
        <p className={styles.emptyMessage}>Nenhum jogador no ranking ainda</p>
      ) : (
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th>Posição</th>
              <th>Jogador</th>
              <th>Pontuação</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isCurrentPlayer = currentPlayerSub !== undefined && entry.username === currentPlayerSub;
              const rowClass = isCurrentPlayer
                ? `${styles.tableRow} ${styles.tableRowHighlight}`
                : styles.tableRow;

              return (
                <tr key={entry.position} className={rowClass}>
                  <td className={styles.position}>{entry.position}</td>
                  <td className={styles.username}>{entry.username}</td>
                  <td className={styles.score}>{entry.score.toLocaleString('pt-BR')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
