import { MediaType } from '../../../types/Media';
import { TmdbType } from '../../../types/Tmdb';
import { isUnreleased } from '../../../utils/media-lists';
import styles from './UnreleasedBadge.module.scss';

type PropTypes = {
  media_data: MediaType;
  tmdb_data: TmdbType;
};

// Rendered unconditionally by MediaWrapper, alongside Title (mount never
// changes between collapsed and expanded — see Title.tsx's own comment for
// why that matters) — one fixed position relative to .content in both
// states, same as Title's own strip. isUnreleased (not media_data's own raw
// `unreleased` flag) is what actually decides visibility, so this stops
// showing itself the moment TMDB's real release date has passed even if
// media-list.json's own flag is stale.
export default function UnreleasedBadge({
  media_data,
  tmdb_data,
}: PropTypes) {
  if (!isUnreleased(media_data, tmdb_data)) return null;

  return <div className={styles.badge}>Unreleased</div>;
}
