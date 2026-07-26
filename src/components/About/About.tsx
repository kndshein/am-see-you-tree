import styles from './About.module.scss';
import { IoMdClose } from 'react-icons/io';
import Modal from 'react-modal';
import patch_notes from '../../assets/patch-notes.json';
import { renderItalicMarkup } from '../../utils/rich-text';
import dateCalc from '../../utils/date-calc';

type PropTypes = {
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

// Matches react-modal's CSS-transition classes below (.overlay_after_open
// etc.) — it needs to know this duration to keep the modal mounted long
// enough for the closing transition to actually play instead of cutting it
// off mid-fade.
const CLOSE_TIMEOUT_MS = 250;

type LinkPropTypes = {
  href: string;
  external?: boolean;
  children: React.ReactNode;
};

// Same bracket-and-bloom treatment as every other link on the site now has
// ([About] itself, Collection/Cast pills) — this used to be a plain italic
// teal link with no relation to that language.
function Link({ href, external = true, children }: LinkPropTypes) {
  return (
    <a
      href={href}
      className={styles.link}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className={styles.link_bracket}>[</span>
      {children}
      <span className={styles.link_bracket}>]</span>
    </a>
  );
}

export default function About({ isModalOpen, setIsModalOpen }: PropTypes) {
  return (
    <Modal
      isOpen={isModalOpen}
      onRequestClose={() => setIsModalOpen(false)}
      // react-modal's own overlay-click detection needs the click to land on
      // its content node's actual DOM sibling, the overlay — .modal_inner
      // below covers that same area on purpose (see its own comment), so
      // that detection can never fire; .modal_inner's onClick replaces it.
      shouldCloseOnOverlayClick={false}
      closeTimeoutMS={CLOSE_TIMEOUT_MS}
      overlayClassName={{
        base: styles.overlay,
        afterOpen: styles.overlay_after_open,
        beforeClose: styles.overlay_before_close,
      }}
      className={{
        base: styles.modal,
        afterOpen: styles.modal_after_open,
        beforeClose: styles.modal_before_close,
      }}
    >
      {/* react-modal's own content node (.modal) needs a definite size —
          .container's max-width: 70% has nothing to resolve against
          otherwise, which is what actually broke centering, not just the
          click-through. This wrapper is what centers .container within that
          full-size area (moved off .modal itself) and, since it's the one
          thing filling all the space around .container, is also what
          "clicked outside .container" means: closes only when the click
          target is this element itself, not a bubbled-up descendant. */}
      <div
        className={styles.modal_inner}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsModalOpen(false);
        }}
      >
        <button
          className={styles.close_btn}
          onClick={() => setIsModalOpen(false)}
        >
          <IoMdClose />
        </button>
        <section className={styles.container}>
          <div className={styles.wrapper}>
            <h1 className={styles.title}>AmSeeYou</h1>
            <section className={styles.body}>
              <p>
                <i>AmSeeYou</i> showcases and cherishes the Marvel Cinematic
                Universe (MCU) films and TV shows. This website presents the
                entire universe in in-universe chronological order from{' '}
                <Link href="https://www.digitalspy.com/movies/a825774/marvel-cinematic-universe-in-chronological-order/">
                  Digital Spy
                </Link>
                .
              </p>
              <p>
                The project was conceived in January of 2021 as a class
                project after having learned what React was just a week
                prior. During the project, I fell in love with the process of
                bringing json objects to life -- it's satisfyingly beautiful.
                Even though the project is long over, I have been adding new
                features and building on existing code ever since.
              </p>
              <p>
                I will continue to maintain the site as long as it still
                brings me joy. Follow along the progression of this site by
                viewing each major versions of the project:{' '}
                <Link href="/v1" external={false}>
                  v1
                </Link>
                , <Link href="/v2" external={false}>v2</Link>, and{' '}
                <Link href="/v3" external={false}>
                  v3
                </Link>
                . Here's to small things in life!
              </p>
              <p>
                Warmly,
                <br /> Kaung <br />
                <Link href="https://knds.art">knds.art</Link>
              </p>
            </section>
            <div className={styles.patch_list}>
              {[...patch_notes].reverse().map(({ version, date, notes, url }, idx) => (
                <div
                  key={version}
                  className={`${styles.patch_row} ${
                    idx === 0 ? styles.current : ''
                  }`}
                >
                  <span className={styles.patch_version}>
                    {url ? (
                      <Link href={url} external={false}>
                        {version}
                      </Link>
                    ) : (
                      version
                    )}
                  </span>
                  <span className={styles.patch_date}>{dateCalc(date)}</span>
                  <div className={styles.patch_notes}>
                    {notes.map((note, note_idx) => (
                      <span key={note_idx}>{renderItalicMarkup(note)}</span>
                    ))}
                  </div>
                  {idx === 0 && (
                    <span className={styles.latest_tag}>Latest</span>
                  )}
                </div>
              ))}
            </div>
            <p>
              Special shoutout to{' '}
              <Link href="https://www.themoviedb.org/">TMDB</Link> for the
              API,{' '}
              <Link href="https://30000fps.com/#">30000fps</Link> for the{' '}
              <Link href="https://giphy.com/gifs/loop-sci-fi-XmppNRlrlu2SA">
                Sci-fi GIF
              </Link>
              , and{' '}
              <Link href="https://twitter.com/Hyperplexed">Hyperplexed</Link>{' '}
              for this{' '}
              <Link href="https://youtu.be/jMVhxBB3l0w">tutorial</Link>.
            </p>
          </div>
        </section>
      </div>
    </Modal>
  );
}
