export function buildBackgroundStyle(track) {
  if (!track || !track.cover) {
    return 'linear-gradient(135deg, #171724 0%, #0a0a0f 100%)'
  }
  return `linear-gradient(135deg, rgba(10,10,15,0.58), rgba(10,10,15,0.78)), url("${track.cover}")`
}

export function sortAlbumsByReleaseDate(albums) {
  return [...albums].sort((a, b) => {
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  })
}

export function getAlbumTracks(albums, albumId) {
  const album = albums.find((item) => item.id === albumId)
  return album ? album.tracks : []
}

export function getNextTrack(tracks, currentTrackId) {
  const currentIndex = tracks.findIndex((track) => track.id === currentTrackId)
  if (currentIndex === -1) return tracks[0]
  return tracks[(currentIndex + 1) % tracks.length]
}

export function getPreviousTrack(tracks, currentTrackId) {
  const currentIndex = tracks.findIndex((track) => track.id === currentTrackId)
  if (currentIndex === -1) return tracks[0]
  return tracks[(currentIndex - 1 + tracks.length) % tracks.length]
}

export function shouldNavigateToArtistPage(searchText, artists) {
  if (!searchText || !artists || artists.length === 0) return null
  const trimmed = searchText.trim().toLowerCase()
  const found = artists.find((artist) => artist.name.toLowerCase() === trimmed)
  return found ? found.id : null
}

export function getAlbumPopupStyle(coverRect) {
  const popupWidth = 320
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080

  let left = coverRect.x + coverRect.width + 20
  if (left + popupWidth > winWidth - 16) {
    left = coverRect.x - popupWidth - 20
  }
  left = Math.max(8, left)

  let top = coverRect.y - 10
  top = Math.max(0, top)

  return {
    top: top + 'px',
    left: left + 'px',
    maxHeight: Math.min(winHeight - top - 20, winHeight * 0.8) + 'px',
  }
}