import { youTubeId, type GameEvent } from "@/lib/stats.ts";

/** Match highlight videos. Tapping opens the YouTube app on Android. */
export default function Highlights({
  teamName, sport, events, showTeam,
}: { teamName?: string; sport?: string; events: (GameEvent & { team?: string })[]; showTeam?: boolean }) {
  const withVideo = events.filter((e) => e.video && /^https?:\/\//.test(e.video));
  const search = teamName
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${teamName} ${sport ?? ""} highlights`.trim())}`
    : null;

  return (
    <section>
      {withVideo.length === 0 && (
        <p className="muted card">No highlight clips are listed for recent games yet.</p>
      )}
      <ul className="clips">
        {withVideo.map((e) => {
          const yt = youTubeId(e.video);
          const thumb = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : e.thumb;
          return (
            <li key={e.id} className="card clip">
              <a href={e.video!} target="_blank" rel="noopener noreferrer">
                <div className="thumb">
                  {thumb ? <img src={thumb} alt="" loading="lazy" /> : <div className="thumb-blank" />}
                  <span className="play" aria-hidden>▶</span>
                </div>
                <strong>
                  {e.homeTeam} {e.homeScore ?? ""}{e.homeScore != null ? " - " : " vs "}{e.awayScore ?? ""} {e.awayTeam}
                </strong>
                <span className="muted small block">{[showTeam && e.team, e.league, e.date].filter(Boolean).join(" · ")}</span>
              </a>
            </li>
          );
        })}
      </ul>
      {search && (
        <a className="btn block-btn" href={search} target="_blank" rel="noopener noreferrer">
          More {teamName} highlights on YouTube
        </a>
      )}
    </section>
  );
}
