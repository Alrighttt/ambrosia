// Curated list of gallery-dl extractors surfaced in Ambrosia's UI.
// Demo-visibility decisions are reflected here; the underlying
// extractor pipeline runs unchanged when a user pastes any URL.
// Update by editing this list directly.
export const GALLERY_DL_SUPPORTED_SITES = [
  {
    "site": "35PHOTO",
    "url": "https://35photo.pro/",
    "host": "35photo.pro",
    "capabilities": "Genres, individual Images, Tag Searches, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://35photo.pro/USER"
      },
      {
        "label": "Tag Searches",
        "url": "https://35photo.pro/tags/TAG/"
      },
      {
        "label": "Genres",
        "url": "https://35photo.pro/genre_12345/"
      },
      {
        "label": "individual Images",
        "url": "https://35photo.pro/photo_12345/"
      }
    ]
  },
  {
    "site": "500px",
    "url": "https://500px.com/",
    "host": "500px.com",
    "capabilities": "Favorites, Galleries, individual Images, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://500px.com/USER"
      },
      {
        "label": "Galleries",
        "url": "https://500px.com/USER/galleries/GALLERY"
      },
      {
        "label": "Favorites",
        "url": "https://500px.com/liked"
      },
      {
        "label": "individual Images",
        "url": "https://500px.com/photo/12345/TITLE"
      }
    ]
  },
  {
    "site": "Adobe Portfolio",
    "url": "https://www.myportfolio.com/",
    "host": "myportfolio.com",
    "capabilities": "Galleries",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://USER.myportfolio.com/TITLE"
      }
    ]
  },
  {
    "site": "AGNPH",
    "url": "https://agn.ph/",
    "host": "agn.ph",
    "capabilities": "Posts, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Tag Searches",
        "url": "https://agn.ph/gallery/post/?search=TAG"
      },
      {
        "label": "Posts",
        "url": "https://agn.ph/gallery/post/show/12345/"
      }
    ]
  },
  {
    "site": "AHottie",
    "url": "https://ahottie.top/",
    "host": "ahottie.top",
    "capabilities": "Galleries, Search Results, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://ahottie.top/albums/1234567890"
      },
      {
        "label": "Tag Searches",
        "url": "https://ahottie.top/tags/TAG"
      },
      {
        "label": "Search Results",
        "url": "https://ahottie.top/search?kw=QUERY"
      }
    ]
  },
  {
    "site": "Arcalive",
    "url": "https://arca.live/",
    "host": "arca.live",
    "capabilities": "Boards, Posts, User Posts",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://arca.live/b/breaking/123456789"
      },
      {
        "label": "Boards",
        "url": "https://arca.live/b/breaking"
      },
      {
        "label": "User Posts",
        "url": "https://arca.live/u/@USER"
      }
    ]
  },
  {
    "site": "Architizer",
    "url": "https://architizer.com/",
    "host": "architizer.com",
    "capabilities": "Firms, Projects",
    "auth": "",
    "examples": [
      {
        "label": "Projects",
        "url": "https://architizer.com/projects/NAME/"
      },
      {
        "label": "Firms",
        "url": "https://architizer.com/firms/NAME/"
      }
    ]
  },
  {
    "site": "Archive of Our Own",
    "url": "https://archiveofourown.org/",
    "host": "archiveofourown.org",
    "capabilities": "Search Results, Series, Subscriptions, Tag Searches, User Profiles, User Bookmarks, User Series, User Works, Works",
    "auth": "Supported",
    "examples": [
      {
        "label": "Works",
        "url": "https://archiveofourown.org/works/12345"
      },
      {
        "label": "Series",
        "url": "https://archiveofourown.org/series/12345"
      },
      {
        "label": "Tag Searches",
        "url": "https://archiveofourown.org/tags/TAG/works"
      },
      {
        "label": "Search Results",
        "url": "https://archiveofourown.org/works/search?work_search[query]=air"
      },
      {
        "label": "User Profiles",
        "url": "https://archiveofourown.org/users/USER"
      },
      {
        "label": "User Works",
        "url": "https://archiveofourown.org/users/USER/works"
      },
      {
        "label": "User Series",
        "url": "https://archiveofourown.org/users/USER/series"
      },
      {
        "label": "User Bookmarks",
        "url": "https://archiveofourown.org/users/USER/bookmarks"
      },
      {
        "label": "Subscriptions",
        "url": "https://archiveofourown.org/users/USER/subscriptions"
      }
    ]
  },
  {
    "site": "Are.na",
    "url": "https://are.na/",
    "host": "are.na",
    "capabilities": "Channels",
    "auth": "",
    "examples": [
      {
        "label": "Channels",
        "url": "https://are.na/evan-collins-1522646491/cassette-futurism"
      }
    ]
  },
  {
    "site": "ArtStation",
    "url": "https://www.artstation.com/",
    "host": "artstation.com",
    "capabilities": "Albums, Artwork Listings, Challenges, Collections, Followed Users, individual Images, Likes, Search Results, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://www.artstation.com/USER"
      },
      {
        "label": "Albums",
        "url": "https://www.artstation.com/USER/albums/12345"
      },
      {
        "label": "Likes",
        "url": "https://www.artstation.com/USER/likes"
      },
      {
        "label": "Collections",
        "url": "https://www.artstation.com/USER/collections/12345"
      },
      {
        "label": "Example",
        "url": "https://www.artstation.com/USER/collections"
      },
      {
        "label": "Challenges",
        "url": "https://www.artstation.com/challenges/NAME/categories/12345"
      },
      {
        "label": "Search Results",
        "url": "https://www.artstation.com/search?query=QUERY"
      },
      {
        "label": "Artwork Listings",
        "url": "https://www.artstation.com/artwork?sorting=SORT"
      },
      {
        "label": "individual Images",
        "url": "https://www.artstation.com/artwork/abcde"
      },
      {
        "label": "Followed Users",
        "url": "https://www.artstation.com/USER/following"
      }
    ]
  },
  {
    "site": "BBC",
    "url": "https://bbc.co.uk/",
    "host": "bbc.co.uk",
    "capabilities": "Galleries, Programmes",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://www.bbc.co.uk/programmes/PATH"
      },
      {
        "label": "Programmes",
        "url": "https://www.bbc.co.uk/programmes/ID/galleries"
      }
    ]
  },
  {
    "site": "Behance",
    "url": "https://www.behance.net/",
    "host": "behance.net",
    "capabilities": "Collections, Galleries, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://www.behance.net/gallery/12345/TITLE"
      },
      {
        "label": "User Profiles",
        "url": "https://www.behance.net/USER"
      },
      {
        "label": "Collections",
        "url": "https://www.behance.net/collection/12345/TITLE"
      }
    ]
  },
  {
    "site": "Bellazon",
    "url": "https://www.bellazon.com/",
    "host": "bellazon.com",
    "capabilities": "Forums, Posts, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://www.bellazon.com/main/topic/123-SLUG/#findComment-12345"
      },
      {
        "label": "Threads",
        "url": "https://www.bellazon.com/main/topic/123-SLUG/"
      },
      {
        "label": "Forums",
        "url": "https://www.bellazon.com/main/forum/123-SLUG/"
      }
    ]
  },
  {
    "site": "Bilibili",
    "url": "https://www.bilibili.com/",
    "host": "bilibili.com",
    "capabilities": "Articles, User Articles, User Article Favorites",
    "auth": "",
    "examples": [
      {
        "label": "Articles",
        "url": "https://www.bilibili.com/opus/12345"
      },
      {
        "label": "User Articles",
        "url": "https://space.bilibili.com/12345/article"
      },
      {
        "label": "User Article Favorites",
        "url": "https://space.bilibili.com/12345/favlist?fid=opus"
      }
    ]
  },
  {
    "site": "Bluesky",
    "url": "https://bsky.app/",
    "host": "bsky.app",
    "capabilities": "Avatars, Backgrounds, Bookmarks, Feeds, Followed Users, Hashtags, User Profile Information, Likes, Lists, Media Files, Posts, Replies, Search Results, User Profiles, Videos",
    "auth": "Supported",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://bsky.app/profile/HANDLE"
      },
      {
        "label": "Example",
        "url": "https://bsky.app/profile/HANDLE/posts"
      },
      {
        "label": "Replies",
        "url": "https://bsky.app/profile/HANDLE/replies"
      },
      {
        "label": "Media Files",
        "url": "https://bsky.app/profile/HANDLE/media"
      },
      {
        "label": "Videos",
        "url": "https://bsky.app/profile/HANDLE/video"
      },
      {
        "label": "Likes",
        "url": "https://bsky.app/profile/HANDLE/likes"
      },
      {
        "label": "Feeds",
        "url": "https://bsky.app/profile/HANDLE/feed/NAME"
      },
      {
        "label": "Lists",
        "url": "https://bsky.app/profile/HANDLE/lists/ID"
      },
      {
        "label": "Followed Users",
        "url": "https://bsky.app/profile/HANDLE/follows"
      },
      {
        "label": "Posts",
        "url": "https://bsky.app/profile/HANDLE/post/ID"
      },
      {
        "label": "User Profile Information",
        "url": "https://bsky.app/profile/HANDLE/info"
      },
      {
        "label": "Avatars",
        "url": "https://bsky.app/profile/HANDLE/avatar"
      },
      {
        "label": "Backgrounds",
        "url": "https://bsky.app/profile/HANDLE/banner"
      },
      {
        "label": "Search Results",
        "url": "https://bsky.app/search?q=QUERY"
      },
      {
        "label": "Hashtags",
        "url": "https://bsky.app/hashtag/NAME"
      },
      {
        "label": "Bookmarks",
        "url": "https://bsky.app/saved"
      }
    ]
  },
  {
    "site": "Boosty",
    "url": "https://www.boosty.to/",
    "host": "boosty.to",
    "capabilities": "DMs, Subscriptions Feed, Followed Users, Media Files, Posts, User Profiles",
    "auth": "Cookies",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://boosty.to/USER"
      },
      {
        "label": "Media Files",
        "url": "https://boosty.to/USER/media/all"
      },
      {
        "label": "Subscriptions Feed",
        "url": "https://boosty.to/"
      },
      {
        "label": "Posts",
        "url": "https://boosty.to/USER/posts/01234567-89ab-cdef-0123-456789abcd"
      },
      {
        "label": "Followed Users",
        "url": "https://boosty.to/app/settings/subscriptions"
      },
      {
        "label": "DMs",
        "url": "https://boosty.to/app/messages?dialogId=12345"
      }
    ]
  },
  {
    "site": "BOOTH",
    "url": "https://booth.pm/",
    "host": "booth.pm",
    "capabilities": "Item Categories, Items, Shops",
    "auth": "",
    "examples": [
      {
        "label": "Items",
        "url": "https://booth.pm/ja/items/12345"
      },
      {
        "label": "Shops",
        "url": "https://SHOP.booth.pm/"
      },
      {
        "label": "Item Categories",
        "url": "https://booth.pm/ja/browse/CATEGORY"
      }
    ]
  },
  {
    "site": "Catbox",
    "url": "https://catbox.moe/",
    "host": "catbox.moe",
    "capabilities": "Albums, Files",
    "auth": "",
    "examples": [
      {
        "label": "Albums",
        "url": "https://catbox.moe/c/ID"
      },
      {
        "label": "Files",
        "url": "https://files.catbox.moe/NAME.EXT"
      }
    ]
  },
  {
    "site": "Celebrity Fakes",
    "url": "https://cfake.com/",
    "host": "cfake.com",
    "capabilities": "Categories, Celebrities, Countries, Created",
    "auth": "",
    "examples": [
      {
        "label": "Celebrities",
        "url": "https://cfake.com/images/celebrity/NAME/123"
      },
      {
        "label": "Categories",
        "url": "https://cfake.com/images/categories/NAME/123"
      },
      {
        "label": "Created",
        "url": "https://cfake.com/images/created/NAME/12345/123"
      },
      {
        "label": "Countries",
        "url": "https://cfake.com/images/country/NAME/12345/123"
      }
    ]
  },
  {
    "site": "CHZZK",
    "url": "https://chzzk.naver.com/",
    "host": "chzzk.naver.com",
    "capabilities": "Comments, Communities",
    "auth": "",
    "examples": [
      {
        "label": "Comments",
        "url": "https://chzzk.naver.com/0123456789abcdef/community/detail/12345"
      },
      {
        "label": "Communities",
        "url": "https://chzzk.naver.com/0123456789abcdef/community"
      }
    ]
  },
  {
    "site": "Ci-en",
    "url": "https://ci-en.net/",
    "host": "ci-en.net",
    "capabilities": "Articles, Creators, Followed Users, Recent Images",
    "auth": "",
    "examples": [
      {
        "label": "Articles",
        "url": "https://ci-en.net/creator/123/article/12345"
      },
      {
        "label": "Creators",
        "url": "https://ci-en.net/creator/123"
      },
      {
        "label": "Recent Images",
        "url": "https://ci-en.net/mypage/recent"
      },
      {
        "label": "Followed Users",
        "url": "https://ci-en.net/mypage/subscription"
      }
    ]
  },
  {
    "site": "Civitai",
    "url": "https://www.civitai.com/",
    "host": "civitai.com",
    "capabilities": "Collections, Generated Files, individual Images, Image Listings, Models, Model Listings, Posts, Post Listings, Image Searches, Model Searches, Tag Searches, User Profiles, User Collections, User Images, Image Reactions, User Models, User Posts, User Videos, Video Reactions, Video Listings",
    "auth": "",
    "examples": [
      {
        "label": "Models",
        "url": "https://civitai.red/models/12345/TITLE"
      },
      {
        "label": "individual Images",
        "url": "https://civitai.red/images/12345"
      },
      {
        "label": "Collections",
        "url": "https://civitai.red/collections/12345"
      },
      {
        "label": "Posts",
        "url": "https://civitai.red/posts/12345"
      },
      {
        "label": "Tag Searches",
        "url": "https://civitai.red/tag/TAG"
      },
      {
        "label": "Model Searches",
        "url": "https://civitai.red/search/models?query=QUERY"
      },
      {
        "label": "Image Searches",
        "url": "https://civitai.red/search/images?query=QUERY"
      },
      {
        "label": "Model Listings",
        "url": "https://civitai.red/models"
      },
      {
        "label": "Image Listings",
        "url": "https://civitai.red/images"
      },
      {
        "label": "Video Listings",
        "url": "https://civitai.red/videos"
      },
      {
        "label": "Post Listings",
        "url": "https://civitai.red/posts"
      },
      {
        "label": "User Profiles",
        "url": "https://civitai.red/user/USER"
      },
      {
        "label": "User Models",
        "url": "https://civitai.red/user/USER/models"
      },
      {
        "label": "User Posts",
        "url": "https://civitai.red/user/USER/posts"
      },
      {
        "label": "User Images, Image Reactions",
        "url": "https://civitai.red/user/USER/images"
      },
      {
        "label": "User Videos, Video Reactions",
        "url": "https://civitai.red/user/USER/videos"
      },
      {
        "label": "User Collections",
        "url": "https://civitai.red/user/USER/collections"
      },
      {
        "label": "Generated Files",
        "url": "https://civitai.red/generate"
      }
    ]
  },
  {
    "site": "Comedy Wildlife Photography Awards",
    "url": "https://www.comedywildlifephoto.com/",
    "host": "comedywildlifephoto.com",
    "capabilities": "Galleries",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://www.comedywildlifephoto.com/gallery/SECTION/TITLE.php"
      }
    ]
  },
  {
    "site": "Comic Vine",
    "url": "https://comicvine.gamespot.com/",
    "host": "comicvine.gamespot.com",
    "capabilities": "Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Tag Searches",
        "url": "https://comicvine.gamespot.com/TAG/123-45/images/"
      }
    ]
  },
  {
    "site": "Comicartfans",
    "url": "https://www.comicartfans.com/",
    "host": "comicartfans.com",
    "capabilities": "Artists, Artworks, Galleries, Search Results",
    "auth": "",
    "examples": [
      {
        "label": "Artworks",
        "url": "https://www.comicartfans.com/gallerypiece.asp?piece=12345"
      },
      {
        "label": "Galleries",
        "url": "https://www.comicartfans.com/gallerydetail.asp?gcat=12345"
      },
      {
        "label": "Search Results",
        "url": "https://www.comicartfans.com/searchresult.asp?QUERY"
      },
      {
        "label": "Artists",
        "url": "https://www.comicartfans.com/comic-artists/ARTIST.asp"
      }
    ]
  },
  {
    "site": "Comick",
    "url": "https://comick.io/",
    "host": "comick.io",
    "capabilities": "Chapters, Covers, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Covers",
        "url": "https://comick.io/comic/MANGA/cover"
      },
      {
        "label": "Chapters",
        "url": "https://comick.io/comic/MANGA/ID-chapter-123-en"
      },
      {
        "label": "Manga",
        "url": "https://comick.io/comic/MANGA"
      }
    ]
  },
  {
    "site": "Cosmos",
    "url": "https://www.cosmos.so/",
    "host": "cosmos.so",
    "capabilities": "Collections, Collections, Elements, Search Results, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Elements",
        "url": "https://cosmos.so/e/1234567890"
      },
      {
        "label": "Search Results",
        "url": "https://www.cosmos.so/search/elements/QUERY"
      },
      {
        "label": "Collections",
        "url": "https://cosmos.so/USER/collections"
      },
      {
        "label": "Collections",
        "url": "https://cosmos.so/USER/COLLECTION"
      },
      {
        "label": "User Profiles",
        "url": "https://cosmos.so/USER"
      }
    ]
  },
  {
    "site": "Cyberdrop",
    "url": "https://cyberdrop.cr/",
    "host": "cyberdrop.cr",
    "capabilities": "Albums, Media Files",
    "auth": "",
    "examples": [
      {
        "label": "Albums",
        "url": "https://cyberdrop.cr/a/ID"
      },
      {
        "label": "Media Files",
        "url": "https://cyberdrop.cr/f/ID"
      }
    ]
  },
  {
    "site": "CyberFile",
    "url": "https://cyberfile.me/",
    "host": "cyberfile.me",
    "capabilities": "Files, Folders, Shares",
    "auth": "",
    "examples": [
      {
        "label": "Folders",
        "url": "https://cyberfile.me/folder/0123456789abcdef/NAME"
      },
      {
        "label": "Shares",
        "url": "https://cyberfile.me/shared/AbCdEfGhIjK"
      },
      {
        "label": "Files",
        "url": "https://cyberfile.me/AbCdE"
      }
    ]
  },
  {
    "site": "Dandadan",
    "url": "https://dandadan.net/",
    "host": "dandadan.net",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://dandadan.net/manga/dandadan-chapter-123/"
      },
      {
        "label": "Manga",
        "url": "https://dandadan.net/"
      }
    ]
  },
  {
    "site": "Danke fürs Lesen",
    "url": "https://danke.moe/",
    "host": "danke.moe",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://danke.moe/read/manga/TITLE/123/1/"
      },
      {
        "label": "Manga",
        "url": "https://danke.moe/read/manga/TITLE/"
      }
    ]
  },
  {
    "site": "Desktopography",
    "url": "https://desktopography.net/",
    "host": "desktopography.net",
    "capabilities": "Entries, Exhibitions",
    "auth": "",
    "examples": [
      {
        "label": "Example",
        "url": "https://desktopography.net/"
      },
      {
        "label": "Exhibitions",
        "url": "https://desktopography.net/exhibition-2020/"
      },
      {
        "label": "Entries",
        "url": "https://desktopography.net/portfolios/NAME/"
      }
    ]
  },
  {
    "site": "DeviantArt",
    "url": "https://www.deviantart.com/",
    "host": "deviantart.com",
    "capabilities": "Avatars, Backgrounds, Collections, Deviations, Favorites, Folders, Followed Users, Galleries, Gallery Searches, Journals, Scraps, Search Results, Sta.sh, Status Updates, Tag Searches, User Profiles, Watches",
    "auth": "OAuth",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://www.deviantart.com/USER"
      },
      {
        "label": "Galleries",
        "url": "https://www.deviantart.com/USER/gallery/"
      },
      {
        "label": "Avatars",
        "url": "https://www.deviantart.com/USER/avatar/"
      },
      {
        "label": "Backgrounds",
        "url": "https://www.deviantart.com/USER/banner/"
      },
      {
        "label": "Folders",
        "url": "https://www.deviantart.com/USER/gallery/12345/TITLE"
      },
      {
        "label": "Sta.sh",
        "url": "https://www.deviantart.com/stash/abcde"
      },
      {
        "label": "Favorites",
        "url": "https://www.deviantart.com/USER/favourites/"
      },
      {
        "label": "Collections",
        "url": "https://www.deviantart.com/USER/favourites/12345/TITLE"
      },
      {
        "label": "Journals",
        "url": "https://www.deviantart.com/USER/posts/journals/"
      },
      {
        "label": "Status Updates",
        "url": "https://www.deviantart.com/USER/posts/statuses/"
      },
      {
        "label": "Tag Searches",
        "url": "https://www.deviantart.com/tag/TAG"
      },
      {
        "label": "Watches",
        "url": "https://www.deviantart.com/watch/deviations"
      },
      {
        "label": "Example",
        "url": "https://www.deviantart.com/watch/posts"
      },
      {
        "label": "Deviations",
        "url": "https://www.deviantart.com/UsER/art/TITLE-12345"
      },
      {
        "label": "Scraps",
        "url": "https://www.deviantart.com/USER/gallery/scraps"
      },
      {
        "label": "Search Results",
        "url": "https://www.deviantart.com/search?q=QUERY"
      },
      {
        "label": "Gallery Searches",
        "url": "https://www.deviantart.com/USER/gallery?q=QUERY"
      },
      {
        "label": "Followed Users",
        "url": "https://www.deviantart.com/USER/about#watching"
      }
    ]
  },
  {
    "site": "Discord",
    "url": "https://discord.com/",
    "host": "discord.com",
    "capabilities": "Channels, DMs, Messages, Servers, Server Assets, Server Searches",
    "auth": "",
    "examples": [
      {
        "label": "Channels",
        "url": "https://discord.com/channels/1234567890/9876543210"
      },
      {
        "label": "Messages",
        "url": "https://discord.com/channels/1234567890/9876543210/2468013579"
      },
      {
        "label": "Server Assets",
        "url": "https://discord.com/channels/1234567890/assets"
      },
      {
        "label": "Server Searches",
        "url": "https://discord.com/channels/1234567890/search?QUERY"
      },
      {
        "label": "Servers",
        "url": "https://discord.com/channels/1234567890"
      },
      {
        "label": "DMs",
        "url": "https://discord.com/channels/@me/1234567890"
      },
      {
        "label": "Example",
        "url": "https://discord.com/channels/@me/1234567890/9876543210"
      }
    ]
  },
  {
    "site": "Dynasty Reader",
    "url": "https://dynasty-scans.com/",
    "host": "dynasty-scans.com",
    "capabilities": "Anthologies, Chapters, individual Images, Manga, Search Results",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://dynasty-scans.com/chapters/NAME"
      },
      {
        "label": "Manga",
        "url": "https://dynasty-scans.com/series/NAME"
      },
      {
        "label": "Search Results",
        "url": "https://dynasty-scans.com/images?QUERY"
      },
      {
        "label": "individual Images",
        "url": "https://dynasty-scans.com/images/12345"
      },
      {
        "label": "Anthologies",
        "url": "https://dynasty-scans.com/anthologies/TITLE"
      }
    ]
  },
  {
    "site": "EVERIA.CLUB",
    "url": "https://everia.club",
    "host": "everia.club",
    "capabilities": "Categories, Dates, Posts, Search Results, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://everia.club/0000/00/00/TITLE"
      },
      {
        "label": "Tag Searches",
        "url": "https://everia.club/tag/TAG"
      },
      {
        "label": "Categories",
        "url": "https://everia.club/category/CATEGORY"
      },
      {
        "label": "Dates",
        "url": "https://everia.club/0000/00/00"
      },
      {
        "label": "Search Results",
        "url": "https://everia.club/?s=SEARCH"
      }
    ]
  },
  {
    "site": "Facebook",
    "url": "https://www.facebook.com/",
    "host": "facebook.com",
    "capabilities": "Albums, Avatars, User Profile Information, Photos, Profile Photos, Sets, User Profiles, Videos",
    "auth": "Cookies",
    "examples": [
      {
        "label": "Photos",
        "url": "https://www.facebook.com/photo/?fbid=PHOTO_ID"
      },
      {
        "label": "Sets",
        "url": "https://www.facebook.com/media/set/?set=SET_ID"
      },
      {
        "label": "Videos",
        "url": "https://www.facebook.com/watch/?v=VIDEO_ID"
      },
      {
        "label": "User Profile Information",
        "url": "https://www.facebook.com/USERNAME/info"
      },
      {
        "label": "Albums",
        "url": "https://www.facebook.com/USERNAME/photos_albums"
      },
      {
        "label": "Profile Photos",
        "url": "https://www.facebook.com/USERNAME/photos"
      },
      {
        "label": "Avatars",
        "url": "https://www.facebook.com/USERNAME/avatar"
      },
      {
        "label": "User Profiles",
        "url": "https://www.facebook.com/USERNAME"
      }
    ]
  },
  {
    "site": "filester.me",
    "url": "https://filester.me/",
    "host": "filester.me",
    "capabilities": "Files, Folders",
    "auth": "",
    "examples": [
      {
        "label": "Files",
        "url": "https://filester.me/d/ID"
      },
      {
        "label": "Folders",
        "url": "https://filester.me/f/ID"
      }
    ]
  },
  {
    "site": "Flickr",
    "url": "https://www.flickr.com/",
    "host": "flickr.com",
    "capabilities": "Albums, Favorites, Galleries, Groups, individual Images, Search Results, User Profiles",
    "auth": "OAuth",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://www.flickr.com/photos/USER/12345"
      },
      {
        "label": "Albums",
        "url": "https://www.flickr.com/photos/USER/albums/12345"
      },
      {
        "label": "Galleries",
        "url": "https://www.flickr.com/photos/USER/galleries/12345/"
      },
      {
        "label": "Groups",
        "url": "https://www.flickr.com/groups/NAME/"
      },
      {
        "label": "User Profiles",
        "url": "https://www.flickr.com/photos/USER/"
      },
      {
        "label": "Favorites",
        "url": "https://www.flickr.com/photos/USER/favorites"
      },
      {
        "label": "Search Results",
        "url": "https://flickr.com/search/?text=QUERY"
      }
    ]
  },
  {
    "site": "foriio",
    "url": "https://foriio.com/",
    "host": "foriio.com",
    "capabilities": "User Profiles, Works",
    "auth": "",
    "examples": [
      {
        "label": "Works",
        "url": "https://www.foriio.com/works/12345"
      },
      {
        "label": "User Profiles",
        "url": "https://foriio.com/USER"
      }
    ]
  },
  {
    "site": "Furry 34 com",
    "url": "https://furry34.com/",
    "host": "furry34.com",
    "capabilities": "Playlists, Posts, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://furry34.com/post/12345"
      },
      {
        "label": "Playlists",
        "url": "https://furry34.com/playlists/view/12345"
      },
      {
        "label": "Tag Searches",
        "url": "https://furry34.com/TAG"
      }
    ]
  },
  {
    "site": "Gofile",
    "url": "https://gofile.io/",
    "host": "gofile.io",
    "capabilities": "Folders",
    "auth": "",
    "examples": [
      {
        "label": "Folders",
        "url": "https://gofile.io/d/ID"
      }
    ]
  },
  {
    "site": "Harvardlawnuremberg",
    "url": "https://nuremberg.law.harvard.edu/",
    "host": "nuremberg.law.harvard.edu",
    "capabilities": "Documents",
    "auth": "",
    "examples": [
      {
        "label": "Documents",
        "url": "https://nuremberg.law.harvard.edu/documents/12345-SLUG"
      }
    ]
  },
  {
    "site": "HatenaBlog",
    "url": "https://hatenablog.com",
    "host": "hatenablog.com",
    "capabilities": "Archive, Individual Posts, Home Feed, Search Results",
    "auth": "",
    "examples": [
      {
        "label": "Individual Posts",
        "url": "https://BLOG.hatenablog.com/entry/PATH"
      },
      {
        "label": "Home Feed",
        "url": "https://BLOG.hatenablog.com"
      },
      {
        "label": "Archive",
        "url": "https://BLOG.hatenablog.com/archive/2024"
      },
      {
        "label": "Search Results",
        "url": "https://BLOG.hatenablog.com/search?q=QUERY"
      }
    ]
  },
  {
    "site": "HDoujin Galleries",
    "url": "https://hdoujin.org/",
    "host": "hdoujin.org",
    "capabilities": "Favorites, Galleries, Search Results",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://hdoujin.org/g/12345/67890abcdef/"
      },
      {
        "label": "Search Results",
        "url": "https://hdoujin.org/browse?s=QUERY"
      },
      {
        "label": "Favorites",
        "url": "https://hdoujin.org/favorites"
      }
    ]
  },
  {
    "site": "HiperDEX",
    "url": "https://hiperdex.com/",
    "host": "hiperdex.com",
    "capabilities": "Artists, Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://hiperdex.com/manga/MANGA/CHAPTER/"
      },
      {
        "label": "Manga",
        "url": "https://hiperdex.com/manga/MANGA/"
      },
      {
        "label": "Artists",
        "url": "https://hiperdex.com/manga-artist/NAME/"
      }
    ]
  },
  {
    "site": "ImageBam",
    "url": "https://www.imagebam.com/",
    "host": "imagebam.com",
    "capabilities": "Galleries, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://www.imagebam.com/view/GID"
      },
      {
        "label": "individual Images",
        "url": "https://www.imagebam.com/view/MID"
      }
    ]
  },
  {
    "site": "ImageChest",
    "url": "https://imgchest.com/",
    "host": "imgchest.com",
    "capabilities": "Galleries, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://imgchest.com/p/abcdefghijk"
      },
      {
        "label": "User Profiles",
        "url": "https://imgchest.com/u/USER"
      }
    ]
  },
  {
    "site": "ImagePond",
    "url": "https://www.imagepond.net/",
    "host": "imagepond.net",
    "capabilities": "Albums, Files, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Files",
        "url": "https://www.imagepond.net/i/ID"
      },
      {
        "label": "Albums",
        "url": "https://www.imagepond.net/a/ID"
      },
      {
        "label": "User Profiles",
        "url": "https://www.imagepond.net/user/USER"
      }
    ]
  },
  {
    "site": "ImageShack",
    "url": "https://imageshack.com/",
    "host": "imageshack.com",
    "capabilities": "Galleries, individual Images, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://imageshack.com/i/ID"
      },
      {
        "label": "Galleries",
        "url": "https://imageshack.com/a/ID"
      },
      {
        "label": "User Profiles",
        "url": "https://imageshack.com/user/USER"
      }
    ]
  },
  {
    "site": "ImgBB",
    "url": "https://imgbb.com/",
    "host": "imgbb.com",
    "capabilities": "Albums, individual Images, User Profiles",
    "auth": "Supported",
    "examples": [
      {
        "label": "Albums",
        "url": "https://ibb.co/album/ID"
      },
      {
        "label": "individual Images",
        "url": "https://ibb.co/ID"
      },
      {
        "label": "User Profiles",
        "url": "https://USER.imgbb.com"
      }
    ]
  },
  {
    "site": "imgbox",
    "url": "https://imgbox.com/",
    "host": "imgbox.com",
    "capabilities": "Galleries, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://imgbox.com/g/12345abcde"
      },
      {
        "label": "individual Images",
        "url": "https://imgbox.com/1234abcd"
      }
    ]
  },
  {
    "site": "imgur",
    "url": "https://imgur.com/",
    "host": "imgur.com",
    "capabilities": "Albums, Favorites, Favorites Folders, Galleries, individual Images, Personal Posts, Search Results, Subreddits, Tag Searches, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://imgur.com/abcdefg"
      },
      {
        "label": "Albums",
        "url": "https://imgur.com/a/abcde"
      },
      {
        "label": "Galleries",
        "url": "https://imgur.com/gallery/abcde"
      },
      {
        "label": "User Profiles",
        "url": "https://imgur.com/user/USER"
      },
      {
        "label": "Favorites",
        "url": "https://imgur.com/user/USER/favorites"
      },
      {
        "label": "Favorites Folders",
        "url": "https://imgur.com/user/USER/favorites/folder/12345/TITLE"
      },
      {
        "label": "Personal Posts",
        "url": "https://imgur.com/user/me"
      },
      {
        "label": "Subreddits",
        "url": "https://imgur.com/r/SUBREDDIT"
      },
      {
        "label": "Tag Searches",
        "url": "https://imgur.com/t/TAG"
      },
      {
        "label": "Search Results",
        "url": "https://imgur.com/search?q=UERY"
      }
    ]
  },
  {
    "site": "Instagram",
    "url": "https://www.instagram.com/",
    "host": "instagram.com",
    "capabilities": "Avatars, Collections, Followers, Followed Users, Guides, Highlights, User Profile Information, Photos, Posts, Reels, Saved Posts, Stories, Stories Home Tray, Tag Searches, Tagged Posts, User Profiles",
    "auth": "Cookies",
    "examples": [
      {
        "label": "Posts",
        "url": "https://www.instagram.com/p/abcdefg/"
      },
      {
        "label": "User Profiles",
        "url": "https://www.instagram.com/USER/"
      },
      {
        "label": "Example",
        "url": "https://www.instagram.com/USER/posts/"
      },
      {
        "label": "Photos",
        "url": "https://www.instagram.com/USER/photos/"
      },
      {
        "label": "Reels",
        "url": "https://www.instagram.com/USER/reels/"
      },
      {
        "label": "Tagged Posts",
        "url": "https://www.instagram.com/USER/tagged/"
      },
      {
        "label": "Guides",
        "url": "https://www.instagram.com/USER/guide/NAME/12345"
      },
      {
        "label": "Saved Posts",
        "url": "https://www.instagram.com/USER/saved/"
      },
      {
        "label": "Collections",
        "url": "https://www.instagram.com/USER/saved/COLLECTION/12345"
      },
      {
        "label": "Stories Home Tray",
        "url": "https://www.instagram.com/stories/me/"
      },
      {
        "label": "Stories",
        "url": "https://www.instagram.com/stories/USER/"
      },
      {
        "label": "Highlights",
        "url": "https://www.instagram.com/USER/highlights/"
      },
      {
        "label": "Followers",
        "url": "https://www.instagram.com/USER/followers/"
      },
      {
        "label": "Followed Users",
        "url": "https://www.instagram.com/USER/following/"
      },
      {
        "label": "Tag Searches",
        "url": "https://www.instagram.com/explore/tags/TAG/"
      },
      {
        "label": "User Profile Information",
        "url": "https://www.instagram.com/USER/info/"
      },
      {
        "label": "Avatars",
        "url": "https://www.instagram.com/USER/avatar/"
      }
    ]
  },
  {
    "site": "Issuu",
    "url": "https://issuu.com/",
    "host": "issuu.com",
    "capabilities": "Publications, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Publications",
        "url": "https://issuu.com/issuu/docs/TITLE/"
      },
      {
        "label": "User Profiles",
        "url": "https://issuu.com/USER"
      }
    ]
  },
  {
    "site": "itch.io",
    "url": "https://itch.io/",
    "host": "itch.io",
    "capabilities": "Games",
    "auth": "",
    "examples": [
      {
        "label": "Games",
        "url": "https://USER.itch.io/GAME"
      }
    ]
  },
  {
    "site": "KaliScan",
    "url": "https://kaliscan.me/",
    "host": "kaliscan.me",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://kaliscan.me/manga/ID-MANGA/chapter-1"
      },
      {
        "label": "Manga",
        "url": "https://kaliscan.me/manga/ID-MANGA"
      }
    ]
  },
  {
    "site": "Keenspot",
    "url": "http://www.keenspot.com/",
    "host": "keenspot.com",
    "capabilities": "Comics",
    "auth": "",
    "examples": [
      {
        "label": "Comics",
        "url": "http://COMIC.keenspot.com/"
      }
    ]
  },
  {
    "site": "Khinsider",
    "url": "https://downloads.khinsider.com/",
    "host": "downloads.khinsider.com",
    "capabilities": "Soundtracks",
    "auth": "",
    "examples": [
      {
        "label": "Soundtracks",
        "url": "https://downloads.khinsider.com/game-soundtracks/album/TITLE"
      }
    ]
  },
  {
    "site": "Komikcast",
    "url": "https://komikcast.li/",
    "host": "komikcast.li",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://komikcast.li/chapter/TITLE/"
      },
      {
        "label": "Manga",
        "url": "https://komikcast.li/komik/TITLE"
      }
    ]
  },
  {
    "site": "Koofr",
    "url": "https://koofr.net/",
    "host": "koofr.net",
    "capabilities": "Shared Links",
    "auth": "",
    "examples": [
      {
        "label": "Shared Links",
        "url": "https://app.koofr.net/links/UUID"
      }
    ]
  },
  {
    "site": "Leak Gallery",
    "url": "https://leakgallery.com",
    "host": "leakgallery.com",
    "capabilities": "Most Liked Posts, Posts, Trending Medias, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://leakgallery.com/creator"
      },
      {
        "label": "Trending Medias",
        "url": "https://leakgallery.com/trending-medias/Week"
      },
      {
        "label": "Most Liked Posts",
        "url": "https://leakgallery.com/most-liked"
      },
      {
        "label": "Posts",
        "url": "https://leakgallery.com/CREATOR/12345"
      }
    ]
  },
  {
    "site": "Lensdump",
    "url": "https://lensdump.com/",
    "host": "lensdump.com",
    "capabilities": "Albums, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "Albums",
        "url": "https://lensdump.com/a/ID"
      },
      {
        "label": "Example",
        "url": "https://lensdump.com/USER"
      },
      {
        "label": "individual Images",
        "url": "https://lensdump.com/i/ID"
      }
    ]
  },
  {
    "site": "Lexica",
    "url": "https://lexica.art/",
    "host": "lexica.art",
    "capabilities": "Search Results",
    "auth": "",
    "examples": [
      {
        "label": "Search Results",
        "url": "https://lexica.art/?q=QUERY"
      }
    ]
  },
  {
    "site": "Lightroom",
    "url": "https://lightroom.adobe.com/",
    "host": "lightroom.adobe.com",
    "capabilities": "Galleries",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://lightroom.adobe.com/shares/0123456789abcdef"
      }
    ]
  },
  {
    "site": "Listal",
    "url": "https://listal.com",
    "host": "listal.com",
    "capabilities": "individual Images, People",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://www.listal.com/viewimage/12345678"
      },
      {
        "label": "People",
        "url": "https://www.listal.com/NAME/pictures"
      }
    ]
  },
  {
    "site": "livedoor Blog",
    "url": "http://blog.livedoor.jp/",
    "host": "blog.livedoor.jp",
    "capabilities": "Blogs, Posts",
    "auth": "",
    "examples": [
      {
        "label": "Blogs",
        "url": "http://blog.livedoor.jp/USER/"
      },
      {
        "label": "Posts",
        "url": "http://blog.livedoor.jp/USER/archives/12345.html"
      }
    ]
  },
  {
    "site": "LOFTER",
    "url": "https://www.lofter.com/",
    "host": "lofter.com",
    "capabilities": "Blog Posts, Posts",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://BLOG.lofter.com/post/12345678_90abcdef"
      },
      {
        "label": "Blog Posts",
        "url": "https://BLOG.lofter.com/"
      }
    ]
  },
  {
    "site": "Madokami",
    "url": "https://manga.madokami.al/",
    "host": "manga.madokami.al",
    "capabilities": "Manga",
    "auth": "Required",
    "examples": [
      {
        "label": "Manga",
        "url": "https://manga.madokami.al/Manga/A/AB/ABCD/ABCDE_TITLE"
      }
    ]
  },
  {
    "site": "Manga Fox",
    "url": "https://fanfox.net/",
    "host": "fanfox.net",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://fanfox.net/manga/TITLE/v01/c001/1.html"
      },
      {
        "label": "Manga",
        "url": "https://fanfox.net/manga/TITLE"
      }
    ]
  },
  {
    "site": "Manga Here",
    "url": "https://www.mangahere.cc/",
    "host": "mangahere.cc",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://www.mangahere.cc/manga/TITLE/c001/1.html"
      },
      {
        "label": "Manga",
        "url": "https://www.mangahere.cc/manga/TITLE"
      }
    ]
  },
  {
    "site": "MangaDex",
    "url": "https://mangadex.org/",
    "host": "mangadex.org",
    "capabilities": "Authors, Chapters, Covers, Updates Feed, Library, MDLists, Manga",
    "auth": "Supported",
    "examples": [
      {
        "label": "Covers",
        "url": "https://mangadex.org/title/01234567-89ab-cdef-0123-456789abcdef?tab=art"
      },
      {
        "label": "Chapters",
        "url": "https://mangadex.org/chapter/01234567-89ab-cdef-0123-456789abcdef"
      },
      {
        "label": "Manga",
        "url": "https://mangadex.org/title/01234567-89ab-cdef-0123-456789abcdef"
      },
      {
        "label": "Updates Feed",
        "url": "https://mangadex.org/title/feed"
      },
      {
        "label": "Library",
        "url": "https://mangadex.org/title/follows"
      },
      {
        "label": "MDLists",
        "url": "https://mangadex.org/list/01234567-89ab-cdef-0123-456789abcdef/NAME"
      },
      {
        "label": "Authors",
        "url": "https://mangadex.org/author/01234567-89ab-cdef-0123-456789abcdef/NAME"
      }
    ]
  },
  {
    "site": "MangaFire",
    "url": "https://mangafire.to/",
    "host": "mangafire.to",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://mangafire.to/read/MANGA.ID/LANG/chapter-123"
      },
      {
        "label": "Manga",
        "url": "https://mangafire.to/manga/MANGA.ID"
      }
    ]
  },
  {
    "site": "MangaFreak",
    "url": "https://ww2.mangafreak.me/",
    "host": "ww2.mangafreak.me",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://ww2.mangafreak.me/Read1_Onepunch_Man_1"
      },
      {
        "label": "Manga",
        "url": "https://ww2.mangafreak.me/Manga/Onepunch_Man"
      }
    ]
  },
  {
    "site": "MangaPark",
    "url": "https://mangapark.net/",
    "host": "mangapark.net",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://mangapark.net/title/MANGA/12345-en-ch.01"
      },
      {
        "label": "Manga",
        "url": "https://mangapark.net/title/12345-MANGA"
      }
    ]
  },
  {
    "site": "MangaRead",
    "url": "https://mangaread.org/",
    "host": "mangaread.org",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://www.mangaread.org/manga/MANGA/chapter-01/"
      },
      {
        "label": "Manga",
        "url": "https://www.mangaread.org/manga/MANGA"
      }
    ]
  },
  {
    "site": "MangaReader",
    "url": "https://mangareader.to/",
    "host": "mangareader.to",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://mangareader.to/read/MANGA-123/LANG/chapter-123"
      },
      {
        "label": "Manga",
        "url": "https://mangareader.to/MANGA-123"
      }
    ]
  },
  {
    "site": "MangaTaro",
    "url": "https://mangataro.org/",
    "host": "mangataro.org",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://mangataro.org/read/MANGA/ch123-12345"
      },
      {
        "label": "Manga",
        "url": "https://mangataro.org/manga/MANGA"
      }
    ]
  },
  {
    "site": "MangaTown",
    "url": "https://www.mangatown.com/",
    "host": "mangatown.com",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://www.mangatown.com/manga/TITLE/c001/1.html"
      },
      {
        "label": "Manga",
        "url": "https://www.mangatown.com/manga/TITLE"
      }
    ]
  },
  {
    "site": "Mangoxo",
    "url": "https://www.mangoxo.com/",
    "host": "mangoxo.com",
    "capabilities": "Albums, Channels",
    "auth": "Supported",
    "examples": [
      {
        "label": "Albums",
        "url": "https://www.mangoxo.com/album/ID"
      },
      {
        "label": "Channels",
        "url": "https://www.mangoxo.com/USER/album"
      }
    ]
  },
  {
    "site": "MixDrop",
    "url": "https://mixdrop.ag/",
    "host": "mixdrop.ag",
    "capabilities": "Files",
    "auth": "",
    "examples": [
      {
        "label": "Files",
        "url": "https://mixdrop.ag/f/0123456789abcdef"
      }
    ]
  },
  {
    "site": "Naver Blog",
    "url": "https://blog.naver.com/",
    "host": "blog.naver.com",
    "capabilities": "Blogs, Posts",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://blog.naver.com/BLOGID/12345"
      },
      {
        "label": "Blogs",
        "url": "https://blog.naver.com/BLOGID"
      }
    ]
  },
  {
    "site": "Naver Webtoon",
    "url": "https://comic.naver.com/",
    "host": "comic.naver.com",
    "capabilities": "Comics, Episodes",
    "auth": "",
    "examples": [
      {
        "label": "Episodes",
        "url": "https://comic.naver.com/webtoon/detail?titleId=12345&no=1"
      },
      {
        "label": "Comics",
        "url": "https://comic.naver.com/webtoon/list?titleId=12345"
      }
    ]
  },
  {
    "site": "Nekohouse",
    "url": "https://nekohouse.su/",
    "host": "nekohouse.su",
    "capabilities": "Posts, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://nekohouse.su/SERVICE/user/12345/post/12345"
      },
      {
        "label": "User Profiles",
        "url": "https://nekohouse.su/SERVICE/user/12345"
      }
    ]
  },
  {
    "site": "Newgrounds",
    "url": "https://www.newgrounds.com/",
    "host": "newgrounds.com",
    "capabilities": "Art, Audio, Favorites, Followed Users, Games, individual Images, Media Files, Movies, Search Results, User Profiles",
    "auth": "Supported",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://www.newgrounds.com/art/view/USER/TITLE"
      },
      {
        "label": "Media Files",
        "url": "https://www.newgrounds.com/portal/view/12345"
      },
      {
        "label": "Art",
        "url": "https://USER.newgrounds.com/art"
      },
      {
        "label": "Audio",
        "url": "https://USER.newgrounds.com/audio"
      },
      {
        "label": "Movies",
        "url": "https://USER.newgrounds.com/movies"
      },
      {
        "label": "Games",
        "url": "https://USER.newgrounds.com/games"
      },
      {
        "label": "User Profiles",
        "url": "https://USER.newgrounds.com"
      },
      {
        "label": "Favorites",
        "url": "https://USER.newgrounds.com/favorites"
      },
      {
        "label": "Followed Users",
        "url": "https://USER.newgrounds.com/favorites/following"
      },
      {
        "label": "Search Results",
        "url": "https://www.newgrounds.com/search/conduct/art?terms=QUERY"
      }
    ]
  },
  {
    "site": "Niconico Seiga",
    "url": "https://seiga.nicovideo.jp/",
    "host": "seiga.nicovideo.jp",
    "capabilities": "individual Images, User Profiles",
    "auth": "Supported",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://seiga.nicovideo.jp/user/illust/12345"
      },
      {
        "label": "individual Images",
        "url": "https://seiga.nicovideo.jp/seiga/im12345"
      }
    ]
  },
  {
    "site": "NudoStar.TV",
    "url": "https://nudostar.tv/",
    "host": "nudostar.tv",
    "capabilities": "individual Images, Models",
    "auth": "",
    "examples": [
      {
        "label": "Models",
        "url": "https://nudostar.tv/models/MODEL/"
      },
      {
        "label": "individual Images",
        "url": "https://nudostar.tv/models/MODEL/123/"
      }
    ]
  },
  {
    "site": "Patreon",
    "url": "https://www.patreon.com/",
    "host": "patreon.com",
    "capabilities": "Collections, Creators, Posts, User Profiles",
    "auth": "Cookies",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.patreon.com/collection/12345"
      },
      {
        "label": "Creators",
        "url": "https://www.patreon.com/c/USER"
      },
      {
        "label": "User Profiles",
        "url": "https://www.patreon.com/home"
      },
      {
        "label": "Posts",
        "url": "https://www.patreon.com/posts/TITLE-12345"
      }
    ]
  },
  {
    "site": "Pexels",
    "url": "https://pexels.com/",
    "host": "pexels.com",
    "capabilities": "Collections, individual Images, Search Results, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.pexels.com/collections/SLUG-a1b2c3/"
      },
      {
        "label": "Search Results",
        "url": "https://www.pexels.com/search/QUERY/"
      },
      {
        "label": "User Profiles",
        "url": "https://www.pexels.com/@USER-12345/"
      },
      {
        "label": "individual Images",
        "url": "https://www.pexels.com/photo/SLUG-12345/"
      }
    ]
  },
  {
    "site": "pholder",
    "url": "https://pholder.com/",
    "host": "pholder.com",
    "capabilities": "Search Results, Subreddits, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Subreddits",
        "url": "https://pholder.com/r/SUBREDDIT"
      },
      {
        "label": "User Profiles",
        "url": "https://www.pholder.com/u/USER"
      },
      {
        "label": "Search Results",
        "url": "https://www.pholder.com/SEARCH"
      }
    ]
  },
  {
    "site": "PhotoVogue",
    "url": "https://www.vogue.com/photovogue/",
    "host": "vogue.com",
    "capabilities": "User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://www.vogue.com/photovogue/photographers/12345"
      }
    ]
  },
  {
    "site": "Picarto",
    "url": "https://picarto.tv/",
    "host": "picarto.tv",
    "capabilities": "Galleries",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://picarto.tv/USER/gallery/TITLE/"
      }
    ]
  },
  {
    "site": "Picazor",
    "url": "https://picazor.com/",
    "host": "picazor.com",
    "capabilities": "User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://picazor.com/en/USERNAME"
      }
    ]
  },
  {
    "site": "Pinterest",
    "url": "https://www.pinterest.com/",
    "host": "pinterest.com",
    "capabilities": "All Pins, Created Pins, Pins, pin.it Links, related Pins, Search Results, Sections, User Profiles",
    "auth": "Cookies",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://www.pinterest.com/USER/"
      },
      {
        "label": "All Pins",
        "url": "https://www.pinterest.com/USER/pins/"
      },
      {
        "label": "Created Pins",
        "url": "https://www.pinterest.com/USER/_created/"
      },
      {
        "label": "Sections",
        "url": "https://www.pinterest.com/USER/BOARD/SECTION"
      },
      {
        "label": "Search Results",
        "url": "https://www.pinterest.com/search/pins/?q=QUERY"
      },
      {
        "label": "Pins",
        "url": "https://www.pinterest.com/pin/12345/"
      },
      {
        "label": "Example",
        "url": "https://www.pinterest.com/USER/BOARD/"
      },
      {
        "label": "related Pins",
        "url": "https://www.pinterest.com/pin/12345/#related"
      },
      {
        "label": "Example",
        "url": "https://www.pinterest.com/USER/BOARD/#related"
      },
      {
        "label": "pin.it Links",
        "url": "https://pin.it/abcde"
      }
    ]
  },
  {
    "site": "pixeldrain",
    "url": "https://pixeldrain.com/",
    "host": "pixeldrain.com",
    "capabilities": "Albums, Files, Filesystems",
    "auth": "",
    "examples": [
      {
        "label": "Files",
        "url": "https://pixeldrain.com/u/abcdefgh"
      },
      {
        "label": "Albums",
        "url": "https://pixeldrain.com/l/abcdefgh"
      },
      {
        "label": "Filesystems",
        "url": "https://pixeldrain.com/d/abcdefgh"
      }
    ]
  },
  {
    "site": "Pixnet",
    "url": "https://www.pixnet.net/",
    "host": "pixnet.net",
    "capabilities": "Folders, individual Images, Sets, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://USER.pixnet.net/album/photo/12345"
      },
      {
        "label": "Sets",
        "url": "https://USER.pixnet.net/album/set/12345"
      },
      {
        "label": "Folders",
        "url": "https://USER.pixnet.net/album/folder/12345"
      },
      {
        "label": "User Profiles",
        "url": "https://USER.pixnet.net/"
      }
    ]
  },
  {
    "site": "Plurk",
    "url": "https://www.plurk.com/",
    "host": "plurk.com",
    "capabilities": "Posts, Timelines",
    "auth": "",
    "examples": [
      {
        "label": "Timelines",
        "url": "https://www.plurk.com/USER"
      },
      {
        "label": "Posts",
        "url": "https://www.plurk.com/p/12345"
      }
    ]
  },
  {
    "site": "Postype",
    "url": "https://www.postype.com/",
    "host": "postype.com",
    "capabilities": "Channels, Posts",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://www.postype.com/@USER/post/12345"
      },
      {
        "label": "Channels",
        "url": "https://www.postype.com/@USER"
      }
    ]
  },
  {
    "site": "Rawkuma",
    "url": "https://rawkuma.net/",
    "host": "rawkuma.net",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://rawkuma.net/manga/7TITLE/chapter-123.321"
      },
      {
        "label": "Manga",
        "url": "https://rawkuma.net/manga/TITLE/"
      }
    ]
  },
  {
    "site": "Read Comic Online",
    "url": "https://readcomiconline.li/",
    "host": "readcomiconline.li",
    "capabilities": "Comic Issues, Comics, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Comic Issues",
        "url": "https://readcomiconline.li/Comic/TITLE/Issue-123?id=12345"
      },
      {
        "label": "Comics",
        "url": "https://readcomiconline.li/Comic/TITLE"
      },
      {
        "label": "Tag Searches",
        "url": "https://readcomiconline.li/Artist/NAME"
      }
    ]
  },
  {
    "site": "Reddit",
    "url": "https://www.reddit.com/",
    "host": "reddit.com",
    "capabilities": "Home Feed, individual Images, Redirects, Submissions, Subreddits, User Profiles",
    "auth": "OAuth",
    "examples": [
      {
        "label": "Subreddits",
        "url": "https://www.reddit.com/r/SUBREDDIT/"
      },
      {
        "label": "Home Feed",
        "url": "https://www.reddit.com/"
      },
      {
        "label": "User Profiles",
        "url": "https://www.reddit.com/user/USER/"
      },
      {
        "label": "Submissions",
        "url": "https://www.reddit.com/r/SUBREDDIT/comments/id/"
      },
      {
        "label": "individual Images",
        "url": "https://i.redd.it/NAME.EXT"
      },
      {
        "label": "Redirects",
        "url": "https://www.reddit.com/r/SUBREDDIT/s/abc456GHIJ"
      }
    ]
  },
  {
    "site": "S3ND",
    "url": "https://s3nd.pics/",
    "host": "s3nd.pics",
    "capabilities": "Posts, Search Results, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://s3nd.pics/post/0123456789abcdef01234567"
      },
      {
        "label": "User Profiles",
        "url": "https://s3nd.pics/user/USER"
      },
      {
        "label": "Search Results",
        "url": "https://s3nd.pics/search?QUERY"
      }
    ]
  },
  {
    "site": "Schale Network",
    "url": "https://niyaniya.moe/",
    "host": "niyaniya.moe",
    "capabilities": "Favorites, Galleries, Search Results",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://niyaniya.moe/g/12345/67890abcde/"
      },
      {
        "label": "Search Results",
        "url": "https://niyaniya.moe/browse?s=QUERY"
      },
      {
        "label": "Favorites",
        "url": "https://niyaniya.moe/favorites"
      }
    ]
  },
  {
    "site": "Sen Manga",
    "url": "https://raw.senmanga.com/",
    "host": "raw.senmanga.com",
    "capabilities": "Chapters",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://raw.senmanga.com/MANGA/CHAPTER"
      }
    ]
  },
  {
    "site": "Skeb",
    "url": "https://skeb.jp/",
    "host": "skeb.jp",
    "capabilities": "Followed Creators, Followed Users, Posts, Search Results, Sent Requests, User Profiles, Works",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://skeb.jp/@USER/works/123"
      },
      {
        "label": "Works",
        "url": "https://skeb.jp/@USER/works"
      },
      {
        "label": "Sent Requests",
        "url": "https://skeb.jp/@USER/sentrequests"
      },
      {
        "label": "User Profiles",
        "url": "https://skeb.jp/@USER"
      },
      {
        "label": "Search Results",
        "url": "https://skeb.jp/search?q=QUERY"
      },
      {
        "label": "Followed Creators",
        "url": "https://skeb.jp/@USER/following_creators"
      },
      {
        "label": "Followed Users",
        "url": "https://skeb.jp/following_users"
      }
    ]
  },
  {
    "site": "SlickPic",
    "url": "https://www.slickpic.com/",
    "host": "slickpic.com",
    "capabilities": "Albums, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Albums",
        "url": "https://USER.slickpic.com/albums/TITLE/"
      },
      {
        "label": "User Profiles",
        "url": "https://USER.slickpic.com/"
      }
    ]
  },
  {
    "site": "SlideShare",
    "url": "https://www.slideshare.net/",
    "host": "slideshare.net",
    "capabilities": "Presentations",
    "auth": "",
    "examples": [
      {
        "label": "Presentations",
        "url": "https://www.slideshare.net/USER/PRESENTATION"
      }
    ]
  },
  {
    "site": "SmugMug",
    "url": "https://www.smugmug.com/",
    "host": "smugmug.com",
    "capabilities": "Albums, individual Images, Images from Users and Folders",
    "auth": "OAuth",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://USER.smugmug.com/PATH/i-ID"
      },
      {
        "label": "Images from Users and Folders",
        "url": "https://USER.smugmug.com/PATH"
      }
    ]
  },
  {
    "site": "Snapchat",
    "url": "https://www.snapchat.com/",
    "host": "snapchat.com",
    "capabilities": "Avatars, Spotlights, Spotlights, Stories, Stories, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Avatars",
        "url": "https://www.snapchat.com/@username/avatar"
      },
      {
        "label": "Stories",
        "url": "https://www.snapchat.com/@username/highlight/c3050cba-2f43-4e06-8ac4-d79069bac22f"
      },
      {
        "label": "Spotlights",
        "url": "https://www.snapchat.com/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYdGFzb3FpYXVuAZqDMm6sAZqDMm6VAAAAAQ"
      },
      {
        "label": "Stories",
        "url": "https://www.snapchat.com/@username/stories"
      },
      {
        "label": "Spotlights",
        "url": "https://www.snapchat.com/@username/spotlights"
      },
      {
        "label": "User Profiles",
        "url": "https://www.snapchat.com/@username"
      }
    ]
  },
  {
    "site": "Soundgasm",
    "url": "https://soundgasm.net/",
    "host": "soundgasm.net",
    "capabilities": "Audio, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Audio",
        "url": "https://soundgasm.net/u/USER/TITLE"
      },
      {
        "label": "User Profiles",
        "url": "https://soundgasm.net/u/USER"
      }
    ]
  },
  {
    "site": "Speaker Deck",
    "url": "https://speakerdeck.com/",
    "host": "speakerdeck.com",
    "capabilities": "Presentations",
    "auth": "",
    "examples": [
      {
        "label": "Presentations",
        "url": "https://speakerdeck.com/USER/PRESENTATION"
      }
    ]
  },
  {
    "site": "SteamGridDB",
    "url": "https://www.steamgriddb.com",
    "host": "steamgriddb.com",
    "capabilities": "Individual Assets, Grids, Heroes, Icons, Logos",
    "auth": "",
    "examples": [
      {
        "label": "Individual Assets",
        "url": "https://www.steamgriddb.com/grid/1234"
      },
      {
        "label": "Grids",
        "url": "https://www.steamgriddb.com/game/1234/grids"
      },
      {
        "label": "Heroes",
        "url": "https://www.steamgriddb.com/game/1234/heroes"
      },
      {
        "label": "Logos",
        "url": "https://www.steamgriddb.com/game/1234/logos"
      },
      {
        "label": "Icons",
        "url": "https://www.steamgriddb.com/game/1234/icons"
      }
    ]
  },
  {
    "site": "Tapas",
    "url": "https://tapas.io/",
    "host": "tapas.io",
    "capabilities": "Creators, Episodes, Series",
    "auth": "Supported",
    "examples": [
      {
        "label": "Episodes",
        "url": "https://tapas.io/episode/12345"
      },
      {
        "label": "Series",
        "url": "https://tapas.io/series/TITLE"
      },
      {
        "label": "Creators",
        "url": "https://tapas.io/CREATOR"
      }
    ]
  },
  {
    "site": "TCB Scans",
    "url": "https://tcbonepiecechapters.com/",
    "host": "tcbonepiecechapters.com",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://tcbonepiecechapters.com/chapters/123/MANGA-chapter-123"
      },
      {
        "label": "Manga",
        "url": "https://tcbonepiecechapters.com/mangas/123/MANGA"
      }
    ]
  },
  {
    "site": "Telegraph",
    "url": "https://telegra.ph/",
    "host": "telegra.ph",
    "capabilities": "Galleries",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://telegra.ph/TITLE"
      }
    ]
  },
  {
    "site": "Tenor",
    "url": "https://tenor.com/",
    "host": "tenor.com",
    "capabilities": "individual Images, Search Results, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://tenor.com/view/SLUG-1234567890"
      },
      {
        "label": "Search Results",
        "url": "https://tenor.com/search/QUERY"
      },
      {
        "label": "User Profiles",
        "url": "https://tenor.com/users/USER"
      }
    ]
  },
  {
    "site": "TikTok",
    "url": "https://www.tiktok.com/",
    "host": "tiktok.com",
    "capabilities": "Avatars, Followed Users (Stories Only), Likes, Posts, User Posts, Reposts, Saved Posts, Stories, User Profiles, VM Posts",
    "auth": "Cookies",
    "examples": [
      {
        "label": "Posts",
        "url": "https://www.tiktok.com/@USER/photo/1234567890"
      },
      {
        "label": "VM Posts",
        "url": "https://vm.tiktok.com/1a2B3c4E5"
      },
      {
        "label": "User Profiles",
        "url": "https://www.tiktok.com/@USER"
      },
      {
        "label": "Avatars",
        "url": "https://www.tiktok.com/@USER/avatar"
      },
      {
        "label": "User Posts",
        "url": "https://www.tiktok.com/@USER/posts"
      },
      {
        "label": "Reposts",
        "url": "https://www.tiktok.com/@USER/reposts"
      },
      {
        "label": "Stories",
        "url": "https://www.tiktok.com/@USER/stories"
      },
      {
        "label": "Likes",
        "url": "https://www.tiktok.com/@USER/liked"
      },
      {
        "label": "Saved Posts",
        "url": "https://www.tiktok.com/@USER/saved"
      },
      {
        "label": "Followed Users (Stories Only)",
        "url": "https://www.tiktok.com/following"
      }
    ]
  },
  {
    "site": "Toyhouse",
    "url": "https://toyhou.se/",
    "host": "toyhou.se",
    "capabilities": "Art, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "Art",
        "url": "https://www.toyhou.se/USER/art"
      },
      {
        "label": "individual Images",
        "url": "https://toyhou.se/~images/12345"
      }
    ]
  },
  {
    "site": "Tumblr",
    "url": "https://www.tumblr.com/",
    "host": "tumblr.com",
    "capabilities": "Days, Followers, Followed Users, Likes, Posts, Search Results, Tag Searches, User Profiles",
    "auth": "OAuth",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://www.tumblr.com/BLOG"
      },
      {
        "label": "Posts",
        "url": "https://www.tumblr.com/BLOG/12345"
      },
      {
        "label": "Tag Searches",
        "url": "https://www.tumblr.com/BLOG/tagged/TAG"
      },
      {
        "label": "Days",
        "url": "https://www.tumblr.com/BLOG/day/1970/01/01"
      },
      {
        "label": "Likes",
        "url": "https://www.tumblr.com/BLOG/likes"
      },
      {
        "label": "Followed Users",
        "url": "https://www.tumblr.com/BLOG/following"
      },
      {
        "label": "Followers",
        "url": "https://www.tumblr.com/BLOG/followers"
      },
      {
        "label": "Search Results",
        "url": "https://www.tumblr.com/search/QUERY"
      }
    ]
  },
  {
    "site": "TumblrGallery",
    "url": "https://tumblrgallery.xyz/",
    "host": "tumblrgallery.xyz",
    "capabilities": "Posts, Search Results, Tumblrblogs",
    "auth": "",
    "examples": [
      {
        "label": "Tumblrblogs",
        "url": "https://tumblrgallery.xyz/tumblrblog/gallery/12345.html"
      },
      {
        "label": "Posts",
        "url": "https://tumblrgallery.xyz/post/12345.html"
      },
      {
        "label": "Search Results",
        "url": "https://tumblrgallery.xyz/s.php?q=QUERY"
      }
    ]
  },
  {
    "site": "Tungsten",
    "url": "https://tungsten.run/",
    "host": "tungsten.run",
    "capabilities": "Models, Posts, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://tungsten.run/post/AbCdEfGhIjKlMnOp"
      },
      {
        "label": "Models",
        "url": "https://tungsten.run/model/AbCdEfGhIjKlM"
      },
      {
        "label": "User Profiles",
        "url": "https://tungsten.run/user/USER"
      }
    ]
  },
  {
    "site": "Twitter",
    "url": "https://x.com/",
    "host": "x.com",
    "capabilities": "Avatars, Backgrounds, Bookmarks, Communities, Events, Followers, Followed Users, Hashtags, Highlights, Home Feed, individual Images, User Profile Information, Likes, Lists, List Members, Media Timelines, Notifications, Quotes, Search Results, Timelines, Tweets, User Profiles",
    "auth": "Cookies",
    "examples": [
      {
        "label": "Home Feed",
        "url": "https://x.com/home"
      },
      {
        "label": "Notifications",
        "url": "https://x.com/notifications"
      },
      {
        "label": "Search Results",
        "url": "https://x.com/search?q=QUERY"
      },
      {
        "label": "Hashtags",
        "url": "https://x.com/hashtag/NAME"
      },
      {
        "label": "User Profiles",
        "url": "https://x.com/USER"
      },
      {
        "label": "Timelines",
        "url": "https://x.com/USER/timeline"
      },
      {
        "label": "Example",
        "url": "https://x.com/USER/tweets"
      },
      {
        "label": "Example",
        "url": "https://x.com/USER/with_replies"
      },
      {
        "label": "Highlights",
        "url": "https://x.com/USER/highlights"
      },
      {
        "label": "Media Timelines",
        "url": "https://x.com/USER/media"
      },
      {
        "label": "Likes",
        "url": "https://x.com/USER/likes"
      },
      {
        "label": "Bookmarks",
        "url": "https://x.com/i/bookmarks"
      },
      {
        "label": "Lists",
        "url": "https://x.com/i/lists/12345"
      },
      {
        "label": "List Members",
        "url": "https://x.com/i/lists/12345/members"
      },
      {
        "label": "Followed Users",
        "url": "https://x.com/USER/following"
      },
      {
        "label": "Followers",
        "url": "https://x.com/USER/followers"
      },
      {
        "label": "Example",
        "url": "https://x.com/i/communities/12345"
      },
      {
        "label": "Communities",
        "url": "https://x.com/i/communities"
      },
      {
        "label": "Events",
        "url": "https://x.com/i/events/12345"
      },
      {
        "label": "Tweets",
        "url": "https://x.com/USER/status/12345"
      },
      {
        "label": "Quotes",
        "url": "https://x.com/USER/status/12345/quotes"
      },
      {
        "label": "User Profile Information",
        "url": "https://x.com/USER/info"
      },
      {
        "label": "Avatars",
        "url": "https://x.com/USER/photo"
      },
      {
        "label": "Backgrounds",
        "url": "https://x.com/USER/header_photo"
      },
      {
        "label": "individual Images",
        "url": "https://pbs.twimg.com/media/ABCDE?format=jpg&name=orig"
      }
    ]
  },
  {
    "site": "Unsplash",
    "url": "https://unsplash.com/",
    "host": "unsplash.com",
    "capabilities": "Collections, Favorites, individual Images, Search Results, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://unsplash.com/photos/ID"
      },
      {
        "label": "User Profiles",
        "url": "https://unsplash.com/@USER"
      },
      {
        "label": "Favorites",
        "url": "https://unsplash.com/@USER/likes"
      },
      {
        "label": "Collections",
        "url": "https://unsplash.com/collections/12345/TITLE"
      },
      {
        "label": "Search Results",
        "url": "https://unsplash.com/s/photos/QUERY"
      }
    ]
  },
  {
    "site": "Uploadir",
    "url": "https://uploadir.com/",
    "host": "uploadir.com",
    "capabilities": "Files",
    "auth": "",
    "examples": [
      {
        "label": "Files",
        "url": "https://uploadir.com/u/ID"
      }
    ]
  },
  {
    "site": "Urlgalleries",
    "url": "https://urlgalleries.com/",
    "host": "urlgalleries.com",
    "capabilities": "Galleries",
    "auth": "",
    "examples": [
      {
        "label": "Galleries",
        "url": "https://urlgalleries.com/BLOG/12345/TITLE"
      }
    ]
  },
  {
    "site": "VK",
    "url": "https://vk.com/",
    "host": "vk.com",
    "capabilities": "Albums, Photos, Tagged Photos, individual Wall Posts",
    "auth": "",
    "examples": [
      {
        "label": "Photos",
        "url": "https://vk.com/id12345"
      },
      {
        "label": "Albums",
        "url": "https://vk.com/album12345_00"
      },
      {
        "label": "Tagged Photos",
        "url": "https://vk.com/tag12345"
      },
      {
        "label": "individual Wall Posts",
        "url": "https://vk.com/wall12345_123"
      }
    ]
  },
  {
    "site": "VSCO",
    "url": "https://vsco.co/",
    "host": "vsco.co",
    "capabilities": "Avatars, Collections, Galleries, individual Images, Spaces, User Profiles, Videos",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://vsco.co/USER"
      },
      {
        "label": "Galleries",
        "url": "https://vsco.co/USER/gallery"
      },
      {
        "label": "Collections",
        "url": "https://vsco.co/USER/collection/1"
      },
      {
        "label": "Spaces",
        "url": "https://vsco.co/spaces/a1b2c3d4e5f"
      },
      {
        "label": "Example",
        "url": "https://vsco.co/USER/spaces"
      },
      {
        "label": "Avatars",
        "url": "https://vsco.co/USER/avatar"
      },
      {
        "label": "individual Images",
        "url": "https://vsco.co/USER/media/0123456789abcdef"
      },
      {
        "label": "Videos",
        "url": "https://vsco.co/USER/video/012345678-9abc-def0"
      }
    ]
  },
  {
    "site": "Wallhaven",
    "url": "https://wallhaven.cc/",
    "host": "wallhaven.cc",
    "capabilities": "Collections, individual Images, Search Results, User Profiles",
    "auth": "API Key",
    "examples": [
      {
        "label": "Search Results",
        "url": "https://wallhaven.cc/search?q=QUERY"
      },
      {
        "label": "Collections",
        "url": "https://wallhaven.cc/user/USER/favorites/12345"
      },
      {
        "label": "User Profiles",
        "url": "https://wallhaven.cc/user/USER"
      },
      {
        "label": "Example",
        "url": "https://wallhaven.cc/user/USER/favorites"
      },
      {
        "label": "Example",
        "url": "https://wallhaven.cc/user/USER/uploads"
      },
      {
        "label": "individual Images",
        "url": "https://wallhaven.cc/w/ID"
      }
    ]
  },
  {
    "site": "Wallpaper Cave",
    "url": "https://wallpapercave.com/",
    "host": "wallpapercave.com",
    "capabilities": "individual Images, Search Results",
    "auth": "",
    "examples": [
      {
        "label": "individual Images, Search Results",
        "url": "https://wallpapercave.com/w/wp12345"
      }
    ]
  },
  {
    "site": "Weasyl",
    "url": "https://www.weasyl.com/",
    "host": "weasyl.com",
    "capabilities": "Favorites, Folders, Journals, Submissions",
    "auth": "API Key",
    "examples": [
      {
        "label": "Submissions",
        "url": "https://www.weasyl.com/~USER/submissions/12345/TITLE"
      },
      {
        "label": "Example",
        "url": "https://www.weasyl.com/submissions/USER"
      },
      {
        "label": "Folders",
        "url": "https://www.weasyl.com/submissions/USER?folderid=12345"
      },
      {
        "label": "Journals",
        "url": "https://www.weasyl.com/journal/12345"
      },
      {
        "label": "Example",
        "url": "https://www.weasyl.com/journals/USER"
      },
      {
        "label": "Favorites",
        "url": "https://www.weasyl.com/favorites?userid=12345"
      }
    ]
  },
  {
    "site": "webmshare",
    "url": "https://webmshare.com/",
    "host": "webmshare.com",
    "capabilities": "Videos",
    "auth": "",
    "examples": [
      {
        "label": "Videos",
        "url": "https://webmshare.com/_ID_"
      }
    ]
  },
  {
    "site": "WEBTOON",
    "url": "https://www.webtoons.com/",
    "host": "webtoons.com",
    "capabilities": "Artists, Comics, Episodes",
    "auth": "",
    "examples": [
      {
        "label": "Episodes",
        "url": "https://www.webtoons.com/en/GENRE/TITLE/NAME/viewer?title_no=123&episode_no=12345"
      },
      {
        "label": "Comics",
        "url": "https://www.webtoons.com/en/GENRE/TITLE/list?title_no=123"
      },
      {
        "label": "Artists",
        "url": "https://www.webtoons.com/p/community/LANG/u/ARTIST"
      }
    ]
  },
  {
    "site": "Weeb Central",
    "url": "https://weebcentral.com/",
    "host": "weebcentral.com",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://weebcentral.com/chapters/01JHABCDEFGHIJKLMNOPQRSTUV"
      },
      {
        "label": "Manga",
        "url": "https://weebcentral.com/series/01J7ABCDEFGHIJKLMNOPQRSTUV/TITLE"
      }
    ]
  },
  {
    "site": "WeebDex",
    "url": "https://weebdex.org/",
    "host": "weebdex.org",
    "capabilities": "Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://weebdex.org/chapter/ID/PAGE"
      },
      {
        "label": "Manga",
        "url": "https://weebdex.org/title/ID/SLUG"
      }
    ]
  },
  {
    "site": "Weibo",
    "url": "https://www.weibo.com/",
    "host": "weibo.com",
    "capabilities": "Albums, Articles, Feeds, Images from Statuses, User Profiles, Videos",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://weibo.com/USER"
      },
      {
        "label": "Example",
        "url": "https://weibo.com/USER?tabtype=home"
      },
      {
        "label": "Feeds",
        "url": "https://weibo.com/USER?tabtype=feed"
      },
      {
        "label": "Videos",
        "url": "https://weibo.com/USER?tabtype=video"
      },
      {
        "label": "Example",
        "url": "https://weibo.com/USER?tabtype=newVideo"
      },
      {
        "label": "Articles",
        "url": "https://weibo.com/USER?tabtype=article"
      },
      {
        "label": "Albums",
        "url": "https://weibo.com/USER?tabtype=album"
      },
      {
        "label": "Images from Statuses",
        "url": "https://weibo.com/detail/12345"
      }
    ]
  },
  {
    "site": "Whyp",
    "url": "https://whyp.it/",
    "host": "whyp.it",
    "capabilities": "Audio, Collections, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "Audio",
        "url": "https://whyp.it/tracks/12345/SLUG"
      },
      {
        "label": "User Profiles",
        "url": "https://whyp.it/users/123/NAME"
      },
      {
        "label": "Collections",
        "url": "https://whyp.it/collections/123/NAME"
      }
    ]
  },
  {
    "site": "WikiArt.org",
    "url": "https://www.wikiart.org/",
    "host": "wikiart.org",
    "capabilities": "Artists, Artist Listings, Artworks, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "Artists",
        "url": "https://www.wikiart.org/en/ARTIST"
      },
      {
        "label": "individual Images",
        "url": "https://www.wikiart.org/en/ARTIST/TITLE"
      },
      {
        "label": "Artworks",
        "url": "https://www.wikiart.org/en/paintings-by-GROUP/TYPE"
      },
      {
        "label": "Artist Listings",
        "url": "https://www.wikiart.org/en/artists-by-GROUP/TYPE"
      }
    ]
  },
  {
    "site": "Xasiat",
    "url": "https://www.xasiat.com",
    "host": "xasiat.com",
    "capabilities": "Albums, Categories, Models, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Albums",
        "url": "https://www.xasiat.com/albums/12345/TITLE/"
      },
      {
        "label": "Tag Searches",
        "url": "https://www.xasiat.com/albums/tags/TAG/"
      },
      {
        "label": "Categories",
        "url": "https://www.xasiat.com/albums/categories/CATEGORY/"
      },
      {
        "label": "Models",
        "url": "https://www.xasiat.com/albums/models/MODEL/"
      }
    ]
  },
  {
    "site": "Xfolio",
    "url": "https://xfolio.jp/",
    "host": "xfolio.jp",
    "capabilities": "Series, User Profiles, Works",
    "auth": "",
    "examples": [
      {
        "label": "Works",
        "url": "https://xfolio.jp/portfolio/USER/works/12345"
      },
      {
        "label": "User Profiles",
        "url": "https://xfolio.jp/portfolio/USER"
      },
      {
        "label": "Series",
        "url": "https://xfolio.jp/portfolio/USER/series/12345"
      }
    ]
  },
  {
    "site": "かべうち",
    "url": "https://kabe-uchiroom.com/",
    "host": "kabe-uchiroom.com",
    "capabilities": "User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://kabe-uchiroom.com/mypage/?id=12345"
      }
    ]
  },
  {
    "site": "もえぴりあ",
    "url": "https://vanilla-rock.com/",
    "host": "vanilla-rock.com",
    "capabilities": "Posts, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://vanilla-rock.com/TITLE"
      },
      {
        "label": "Tag Searches",
        "url": "https://vanilla-rock.com/tag/TAG"
      }
    ]
  },
  {
    "site": "Blogspot",
    "url": "https://www.blogger.com/",
    "host": "blogger.com",
    "capabilities": "Blogs, Labels, Posts, Search Results",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://BLOG.blogspot.com/1970/01/TITLE.html"
      },
      {
        "label": "Blogs",
        "url": "https://BLOG.blogspot.com/"
      },
      {
        "label": "Search Results",
        "url": "https://BLOG.blogspot.com/search?q=QUERY"
      },
      {
        "label": "Labels",
        "url": "https://BLOG.blogspot.com/search/label/LABEL"
      }
    ]
  },
  {
    "site": "The Big ImageBoard",
    "url": "https://tbib.org/",
    "host": "tbib.org",
    "capabilities": "Favorites, Pools, Posts, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Tag Searches",
        "url": "https://safebooru.org/index.php?page=post&s=list&tags=TAG"
      },
      {
        "label": "Pools",
        "url": "https://safebooru.org/index.php?page=pool&s=show&id=12345"
      },
      {
        "label": "Favorites",
        "url": "https://safebooru.org/index.php?page=favorites&s=view&id=12345"
      },
      {
        "label": "Posts",
        "url": "https://safebooru.org/index.php?page=post&s=view&id=12345"
      }
    ]
  },
  {
    "site": "MangaNelo",
    "url": "https://www.nelomanga.net/",
    "host": "nelomanga.net",
    "capabilities": "Bookmarks, Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME/chapter-123"
      },
      {
        "label": "Manga",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME"
      },
      {
        "label": "Bookmarks",
        "url": "https://www.mangakakalot.gg/bookmark"
      }
    ]
  },
  {
    "site": "MangaNato",
    "url": "https://www.natomanga.com/",
    "host": "natomanga.com",
    "capabilities": "Bookmarks, Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME/chapter-123"
      },
      {
        "label": "Manga",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME"
      },
      {
        "label": "Bookmarks",
        "url": "https://www.mangakakalot.gg/bookmark"
      }
    ]
  },
  {
    "site": "MangaNato",
    "url": "https://www.manganato.gg/",
    "host": "manganato.gg",
    "capabilities": "Bookmarks, Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME/chapter-123"
      },
      {
        "label": "Manga",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME"
      },
      {
        "label": "Bookmarks",
        "url": "https://www.mangakakalot.gg/bookmark"
      }
    ]
  },
  {
    "site": "MangaKakalot",
    "url": "https://www.mangakakalot.gg/",
    "host": "mangakakalot.gg",
    "capabilities": "Bookmarks, Chapters, Manga",
    "auth": "",
    "examples": [
      {
        "label": "Chapters",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME/chapter-123"
      },
      {
        "label": "Manga",
        "url": "https://www.mangakakalot.gg/manga/MANGA_NAME"
      },
      {
        "label": "Bookmarks",
        "url": "https://www.mangakakalot.gg/bookmark"
      }
    ]
  },
  {
    "site": "Sushi.ski",
    "url": "https://sushi.ski/",
    "host": "sushi.ski",
    "capabilities": "Avatars, Backgrounds, Favorites, Followed Users, User Profile Information, Notes, User Notes, User Profiles",
    "auth": "",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://misskey.io/@USER"
      },
      {
        "label": "User Notes",
        "url": "https://misskey.io/@USER/notes"
      },
      {
        "label": "User Profile Information",
        "url": "https://misskey.io/@USER/info"
      },
      {
        "label": "Avatars",
        "url": "https://misskey.io/@USER/avatar"
      },
      {
        "label": "Backgrounds",
        "url": "https://misskey.io/@USER/banner"
      },
      {
        "label": "Followed Users",
        "url": "https://misskey.io/@USER/following"
      },
      {
        "label": "Notes",
        "url": "https://misskey.io/notes/98765"
      },
      {
        "label": "Favorites",
        "url": "https://misskey.io/my/favorites"
      }
    ]
  },
  {
    "site": "horne",
    "url": "https://horne.red/",
    "host": "horne.red",
    "capabilities": "Doujin, Favorites, Feeds, Followeds, Illustrations, individual Images, Nuitas, User Profiles",
    "auth": "Required",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://nijie.info/members.php?id=12345"
      },
      {
        "label": "Illustrations",
        "url": "https://nijie.info/members_illust.php?id=12345"
      },
      {
        "label": "Doujin",
        "url": "https://nijie.info/members_dojin.php?id=12345"
      },
      {
        "label": "Favorites",
        "url": "https://nijie.info/user_like_illust_view.php?id=12345"
      },
      {
        "label": "Nuitas",
        "url": "https://nijie.info/history_nuita.php?id=12345"
      },
      {
        "label": "Feeds",
        "url": "https://nijie.info/like_user_view.php"
      },
      {
        "label": "Followeds",
        "url": "https://nijie.info/like_my.php"
      },
      {
        "label": "individual Images",
        "url": "https://nijie.info/view.php?id=12345"
      }
    ]
  },
  {
    "site": "Nitter.net",
    "url": "https://nitter.net/",
    "host": "nitter.net",
    "capabilities": "Media Files, Replies, Search Results, Tweets",
    "auth": "",
    "examples": [
      {
        "label": "Example",
        "url": "https://nitter.net/USER"
      },
      {
        "label": "Replies",
        "url": "https://nitter.net/USER/with_replies"
      },
      {
        "label": "Media Files",
        "url": "https://nitter.net/USER/media"
      },
      {
        "label": "Search Results",
        "url": "https://nitter.net/USER/search"
      },
      {
        "label": "Tweets",
        "url": "https://nitter.net/USER/status/12345"
      }
    ]
  },
  {
    "site": "Nitter.space",
    "url": "https://nitter.space/",
    "host": "nitter.space",
    "capabilities": "Media Files, Replies, Search Results, Tweets",
    "auth": "",
    "examples": [
      {
        "label": "Example",
        "url": "https://nitter.net/USER"
      },
      {
        "label": "Replies",
        "url": "https://nitter.net/USER/with_replies"
      },
      {
        "label": "Media Files",
        "url": "https://nitter.net/USER/media"
      },
      {
        "label": "Search Results",
        "url": "https://nitter.net/USER/search"
      },
      {
        "label": "Tweets",
        "url": "https://nitter.net/USER/status/12345"
      }
    ]
  },
  {
    "site": "Nitter.tiekoetter",
    "url": "https://nitter.tiekoetter/",
    "host": "nitter.tiekoetter",
    "capabilities": "Media Files, Replies, Search Results, Tweets",
    "auth": "",
    "examples": [
      {
        "label": "Example",
        "url": "https://nitter.net/USER"
      },
      {
        "label": "Replies",
        "url": "https://nitter.net/USER/with_replies"
      },
      {
        "label": "Media Files",
        "url": "https://nitter.net/USER/media"
      },
      {
        "label": "Search Results",
        "url": "https://nitter.net/USER/search"
      },
      {
        "label": "Tweets",
        "url": "https://nitter.net/USER/status/12345"
      }
    ]
  },
  {
    "site": "Xcancel",
    "url": "https://xcancel.com/",
    "host": "xcancel.com",
    "capabilities": "Media Files, Replies, Search Results, Tweets",
    "auth": "",
    "examples": [
      {
        "label": "Example",
        "url": "https://nitter.net/USER"
      },
      {
        "label": "Replies",
        "url": "https://nitter.net/USER/with_replies"
      },
      {
        "label": "Media Files",
        "url": "https://nitter.net/USER/media"
      },
      {
        "label": "Search Results",
        "url": "https://nitter.net/USER/search"
      },
      {
        "label": "Tweets",
        "url": "https://nitter.net/USER/status/12345"
      }
    ]
  },
  {
    "site": "Lightbrd",
    "url": "https://lightbrd.com/",
    "host": "lightbrd.com",
    "capabilities": "Media Files, Replies, Search Results, Tweets",
    "auth": "",
    "examples": [
      {
        "label": "Example",
        "url": "https://nitter.net/USER"
      },
      {
        "label": "Replies",
        "url": "https://nitter.net/USER/with_replies"
      },
      {
        "label": "Media Files",
        "url": "https://nitter.net/USER/media"
      },
      {
        "label": "Search Results",
        "url": "https://nitter.net/USER/search"
      },
      {
        "label": "Tweets",
        "url": "https://nitter.net/USER/status/12345"
      }
    ]
  },
  {
    "site": "Bitly",
    "url": "https://bit.ly/",
    "host": "bit.ly",
    "capabilities": "Links",
    "auth": "",
    "examples": [
      {
        "label": "Links",
        "url": "https://bit.ly/abcde"
      }
    ]
  },
  {
    "site": "Twitter t.co",
    "url": "https://t.co/",
    "host": "t.co",
    "capabilities": "Links",
    "auth": "",
    "examples": [
      {
        "label": "Links",
        "url": "https://bit.ly/abcde"
      }
    ]
  },
  {
    "site": "Wikimedia",
    "url": "https://www.wikimedia.org/",
    "host": "wikimedia.org",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "Wikispecies",
    "url": "https://species.wikimedia.org/",
    "host": "species.wikimedia.org",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "Wikimedia Commons",
    "url": "https://commons.wikimedia.org/",
    "host": "commons.wikimedia.org",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "MediaWiki",
    "url": "https://www.mediawiki.org/",
    "host": "mediawiki.org",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "Super Mario Wiki",
    "url": "https://www.mariowiki.com/",
    "host": "mariowiki.com",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "Bulbapedia",
    "url": "https://bulbapedia.bulbagarden.net/",
    "host": "bulbapedia.bulbagarden.net",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "PidgiWiki",
    "url": "https://www.pidgi.net/",
    "host": "pidgi.net",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "Azur Lane Wiki",
    "url": "https://azurlane.koumakan.jp/",
    "host": "azurlane.koumakan.jp",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "Monster Girl Encyclopedia Wiki",
    "url": "https://mgewiki.moe/",
    "host": "mgewiki.moe",
    "capabilities": "Articles, Categories, Files, Wikis",
    "auth": "",
    "examples": [
      {
        "label": "Articles, Categories, Files",
        "url": "https://en.wikipedia.org/wiki/TITLE"
      },
      {
        "label": "Wikis",
        "url": "https://en.wikipedia.org/"
      }
    ]
  },
  {
    "site": "SimpCity Forums",
    "url": "https://simpcity.cr/",
    "host": "simpcity.cr",
    "capabilities": "Forums, Albums, Media Categories, Media Files, User Media, Posts, Profiles, Threads",
    "auth": "Supported",
    "examples": [
      {
        "label": "Posts",
        "url": "https://simpcity.cr/threads/TITLE.12345/post-54321"
      },
      {
        "label": "Threads",
        "url": "https://simpcity.cr/threads/TITLE.12345/"
      },
      {
        "label": "Forums",
        "url": "https://simpcity.cr/forums/TITLE.123/"
      },
      {
        "label": "User Media",
        "url": "https://simpcity.cr/media/users/USER.123/"
      },
      {
        "label": "Albums",
        "url": "https://simpcity.cr/media/albums/ALBUM.123/"
      },
      {
        "label": "Media Categories",
        "url": "https://simpcity.cr/media/categories/CATEGORY.123/"
      },
      {
        "label": "Media Files",
        "url": "https://simpcity.cr/media/NAME.123/"
      },
      {
        "label": "Profiles",
        "url": "https://simpcity.cr/members/USER.123/"
      }
    ]
  },
  {
    "site": "NudoStar Forums",
    "url": "https://nudostar.com/forum/",
    "host": "nudostar.com",
    "capabilities": "Forums, Albums, Media Categories, Media Files, User Media, Posts, Profiles, Threads",
    "auth": "Supported",
    "examples": [
      {
        "label": "Posts",
        "url": "https://simpcity.cr/threads/TITLE.12345/post-54321"
      },
      {
        "label": "Threads",
        "url": "https://simpcity.cr/threads/TITLE.12345/"
      },
      {
        "label": "Forums",
        "url": "https://simpcity.cr/forums/TITLE.123/"
      },
      {
        "label": "User Media",
        "url": "https://simpcity.cr/media/users/USER.123/"
      },
      {
        "label": "Albums",
        "url": "https://simpcity.cr/media/albums/ALBUM.123/"
      },
      {
        "label": "Media Categories",
        "url": "https://simpcity.cr/media/categories/CATEGORY.123/"
      },
      {
        "label": "Media Files",
        "url": "https://simpcity.cr/media/NAME.123/"
      },
      {
        "label": "Profiles",
        "url": "https://simpcity.cr/members/USER.123/"
      }
    ]
  },
  {
    "site": "All The Fallen",
    "url": "https://allthefallen.moe/forum/",
    "host": "allthefallen.moe",
    "capabilities": "Forums, Albums, Media Categories, Media Files, User Media, Posts, Profiles, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://simpcity.cr/threads/TITLE.12345/post-54321"
      },
      {
        "label": "Threads",
        "url": "https://simpcity.cr/threads/TITLE.12345/"
      },
      {
        "label": "Forums",
        "url": "https://simpcity.cr/forums/TITLE.123/"
      },
      {
        "label": "User Media",
        "url": "https://simpcity.cr/media/users/USER.123/"
      },
      {
        "label": "Albums",
        "url": "https://simpcity.cr/media/albums/ALBUM.123/"
      },
      {
        "label": "Media Categories",
        "url": "https://simpcity.cr/media/categories/CATEGORY.123/"
      },
      {
        "label": "Media Files",
        "url": "https://simpcity.cr/media/NAME.123/"
      },
      {
        "label": "Profiles",
        "url": "https://simpcity.cr/members/USER.123/"
      }
    ]
  },
  {
    "site": "celebforum",
    "url": "https://celebforum.to/",
    "host": "celebforum.to",
    "capabilities": "Forums, Albums, Media Categories, Media Files, User Media, Posts, Profiles, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://simpcity.cr/threads/TITLE.12345/post-54321"
      },
      {
        "label": "Threads",
        "url": "https://simpcity.cr/threads/TITLE.12345/"
      },
      {
        "label": "Forums",
        "url": "https://simpcity.cr/forums/TITLE.123/"
      },
      {
        "label": "User Media",
        "url": "https://simpcity.cr/media/users/USER.123/"
      },
      {
        "label": "Albums",
        "url": "https://simpcity.cr/media/albums/ALBUM.123/"
      },
      {
        "label": "Media Categories",
        "url": "https://simpcity.cr/media/categories/CATEGORY.123/"
      },
      {
        "label": "Media Files",
        "url": "https://simpcity.cr/media/NAME.123/"
      },
      {
        "label": "Profiles",
        "url": "https://simpcity.cr/members/USER.123/"
      }
    ]
  },
  {
    "site": "Tits In Tops Forum",
    "url": "https://titsintops.com/phpBB2/",
    "host": "titsintops.com",
    "capabilities": "Forums, Albums, Media Categories, Media Files, User Media, Posts, Profiles, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://simpcity.cr/threads/TITLE.12345/post-54321"
      },
      {
        "label": "Threads",
        "url": "https://simpcity.cr/threads/TITLE.12345/"
      },
      {
        "label": "Forums",
        "url": "https://simpcity.cr/forums/TITLE.123/"
      },
      {
        "label": "User Media",
        "url": "https://simpcity.cr/media/users/USER.123/"
      },
      {
        "label": "Albums",
        "url": "https://simpcity.cr/media/albums/ALBUM.123/"
      },
      {
        "label": "Media Categories",
        "url": "https://simpcity.cr/media/categories/CATEGORY.123/"
      },
      {
        "label": "Media Files",
        "url": "https://simpcity.cr/media/NAME.123/"
      },
      {
        "label": "Profiles",
        "url": "https://simpcity.cr/members/USER.123/"
      }
    ]
  },
  {
    "site": "BlacktoWhite",
    "url": "https://www.blacktowhite.net/",
    "host": "blacktowhite.net",
    "capabilities": "Forums, Albums, Media Categories, Media Files, User Media, Posts, Profiles, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Posts",
        "url": "https://simpcity.cr/threads/TITLE.12345/post-54321"
      },
      {
        "label": "Threads",
        "url": "https://simpcity.cr/threads/TITLE.12345/"
      },
      {
        "label": "Forums",
        "url": "https://simpcity.cr/forums/TITLE.123/"
      },
      {
        "label": "User Media",
        "url": "https://simpcity.cr/media/users/USER.123/"
      },
      {
        "label": "Albums",
        "url": "https://simpcity.cr/media/albums/ALBUM.123/"
      },
      {
        "label": "Media Categories",
        "url": "https://simpcity.cr/media/categories/CATEGORY.123/"
      },
      {
        "label": "Media Files",
        "url": "https://simpcity.cr/media/NAME.123/"
      },
      {
        "label": "Profiles",
        "url": "https://simpcity.cr/members/USER.123/"
      }
    ]
  },
  {
    "site": "yande.re",
    "url": "https://yande.re/",
    "host": "yande.re",
    "capabilities": "Pools, Popular Images, Posts, Tag Searches",
    "auth": "",
    "examples": [
      {
        "label": "Tag Searches",
        "url": "https://yande.re/post?tags=TAG"
      },
      {
        "label": "Pools",
        "url": "https://yande.re/pool/show/12345"
      },
      {
        "label": "Posts",
        "url": "https://yande.re/post/show/12345"
      },
      {
        "label": "Popular Images",
        "url": "https://yande.re/post/popular_by_month?year=YYYY&month=MM"
      }
    ]
  },
  {
    "site": "Archived.Moe",
    "url": "https://archived.moe/",
    "host": "archived.moe",
    "capabilities": "Boards, Galleries, Search Results, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Threads",
        "url": "https://archived.moe/a/thread/12345/"
      },
      {
        "label": "Boards",
        "url": "https://archived.moe/a/"
      },
      {
        "label": "Search Results",
        "url": "https://archived.moe/_/search/text/QUERY/"
      },
      {
        "label": "Galleries",
        "url": "https://archived.moe/a/gallery"
      }
    ]
  },
  {
    "site": "Archive of Sins",
    "url": "https://archiveofsins.com/",
    "host": "archiveofsins.com",
    "capabilities": "Boards, Galleries, Search Results, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Threads",
        "url": "https://archived.moe/a/thread/12345/"
      },
      {
        "label": "Boards",
        "url": "https://archived.moe/a/"
      },
      {
        "label": "Search Results",
        "url": "https://archived.moe/_/search/text/QUERY/"
      },
      {
        "label": "Galleries",
        "url": "https://archived.moe/a/gallery"
      }
    ]
  },
  {
    "site": "arch.b4k.dev",
    "url": "https://arch.b4k.dev/",
    "host": "arch.b4k.dev",
    "capabilities": "Boards, Galleries, Search Results, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Threads",
        "url": "https://archived.moe/a/thread/12345/"
      },
      {
        "label": "Boards",
        "url": "https://archived.moe/a/"
      },
      {
        "label": "Search Results",
        "url": "https://archived.moe/_/search/text/QUERY/"
      },
      {
        "label": "Galleries",
        "url": "https://archived.moe/a/gallery"
      }
    ]
  },
  {
    "site": "Palanq",
    "url": "https://archive.palanq.win/",
    "host": "archive.palanq.win",
    "capabilities": "Boards, Galleries, Search Results, Threads",
    "auth": "",
    "examples": [
      {
        "label": "Threads",
        "url": "https://archived.moe/a/thread/12345/"
      },
      {
        "label": "Boards",
        "url": "https://archived.moe/a/"
      },
      {
        "label": "Search Results",
        "url": "https://archived.moe/_/search/text/QUERY/"
      },
      {
        "label": "Galleries",
        "url": "https://archived.moe/a/gallery"
      }
    ]
  },
  {
    "site": "mastodon.social",
    "url": "https://mastodon.social/",
    "host": "mastodon.social",
    "capabilities": "Bookmarks, Favorites, Followed Users, Hashtags, Lists, Images from Statuses, User Profiles",
    "auth": "OAuth",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://mastodon.social/@USER"
      },
      {
        "label": "Bookmarks",
        "url": "https://mastodon.social/bookmarks"
      },
      {
        "label": "Favorites",
        "url": "https://mastodon.social/favourites"
      },
      {
        "label": "Lists",
        "url": "https://mastodon.social/lists/12345"
      },
      {
        "label": "Hashtags",
        "url": "https://mastodon.social/tags/NAME"
      },
      {
        "label": "Followed Users",
        "url": "https://mastodon.social/@USER/following"
      },
      {
        "label": "Images from Statuses",
        "url": "https://mastodon.social/@USER/12345"
      }
    ]
  },
  {
    "site": "baraag",
    "url": "https://baraag.net/",
    "host": "baraag.net",
    "capabilities": "Bookmarks, Favorites, Followed Users, Hashtags, Lists, Images from Statuses, User Profiles",
    "auth": "OAuth",
    "examples": [
      {
        "label": "User Profiles",
        "url": "https://mastodon.social/@USER"
      },
      {
        "label": "Bookmarks",
        "url": "https://mastodon.social/bookmarks"
      },
      {
        "label": "Favorites",
        "url": "https://mastodon.social/favourites"
      },
      {
        "label": "Lists",
        "url": "https://mastodon.social/lists/12345"
      },
      {
        "label": "Hashtags",
        "url": "https://mastodon.social/tags/NAME"
      },
      {
        "label": "Followed Users",
        "url": "https://mastodon.social/@USER/following"
      },
      {
        "label": "Images from Statuses",
        "url": "https://mastodon.social/@USER/12345"
      }
    ]
  },
  {
    "site": "Chelseacrew",
    "url": "https://chelseacrew.com/",
    "host": "chelseacrew.com",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Fashion Nova",
    "url": "https://www.fashionnova.com/",
    "host": "fashionnova.com",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Michaelscameras",
    "url": "https://michaels.com.au/",
    "host": "michaels.com.au",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Modcloth",
    "url": "https://modcloth.com/",
    "host": "modcloth.com",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Omg Miami Swimwear",
    "url": "https://www.omgmiamiswimwear.com/",
    "host": "omgmiamiswimwear.com",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Raidlondon",
    "url": "https://www.raidlondon.com/",
    "host": "raidlondon.com",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Unique-vintage",
    "url": "https://www.unique-vintage.com/",
    "host": "unique-vintage.com",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Windsorstore",
    "url": "https://www.windsorstore.com/",
    "host": "windsorstore.com",
    "capabilities": "Collections, Products",
    "auth": "",
    "examples": [
      {
        "label": "Collections",
        "url": "https://www.fashionnova.com/collections/TITLE"
      },
      {
        "label": "Products",
        "url": "https://www.fashionnova.com/collections/TITLE/products/NAME"
      }
    ]
  },
  {
    "site": "Acidimg",
    "url": "https://acidimg.cc/",
    "host": "acidimg.cc",
    "capabilities": "individual Images",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://acidimg.cc/img-abc123.html"
      }
    ]
  },
  {
    "site": "ImageTwist",
    "url": "https://imagetwist.com/",
    "host": "imagetwist.com",
    "capabilities": "Galleries, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://imagetwist.com/123456abcdef/NAME.EXT"
      },
      {
        "label": "Galleries",
        "url": "https://imagetwist.com/p/USER/12345/TITLE"
      }
    ]
  },
  {
    "site": "Imagevenue",
    "url": "https://www.imagevenue.com/",
    "host": "imagevenue.com",
    "capabilities": "individual Images",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://www.imagevenue.com/ME123456789"
      }
    ]
  },
  {
    "site": "PicState",
    "url": "https://picstate.com/",
    "host": "picstate.com",
    "capabilities": "individual Images",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://picstate.com/view/full/123"
      }
    ]
  },
  {
    "site": "PiXhost",
    "url": "https://pixhost.to/",
    "host": "pixhost.to",
    "capabilities": "Galleries, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://pixhost.to/show/123/12345_NAME.EXT"
      },
      {
        "label": "Galleries",
        "url": "https://pixhost.to/gallery/ID"
      }
    ]
  },
  {
    "site": "Postimages",
    "url": "https://postimages.org/",
    "host": "postimages.org",
    "capabilities": "Galleries, individual Images",
    "auth": "",
    "examples": [
      {
        "label": "individual Images",
        "url": "https://postimg.cc/ID"
      },
      {
        "label": "Galleries",
        "url": "https://postimg.cc/gallery/ID"
      }
    ]
  }
];
