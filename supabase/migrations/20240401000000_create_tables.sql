-- Create wines table
CREATE TABLE IF NOT EXISTS public.wines (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text           NOT NULL,
  region           text,
  country          text,
  producer         text,
  vintage          text,     -- text to allow "NV", "MV", etc.
  wine_type        text,     -- e.g., "red", "white"
  grape_variety    text,
  image_url        text,
  average_price    numeric(10,2),
  description      text,
  wine_searcher_id text,     -- if set, references external data (Wine Searcher, etc.)
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT unique_wine_searcher_id UNIQUE NULLS NOT DISTINCT (wine_searcher_id)
);

-- Create cellars table
CREATE TABLE IF NOT EXISTS public.cellars (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid         NOT NULL,       -- references auth.users(id)
  name       text         NOT NULL,
  sections   jsonb,                       -- e.g. ["Rack A", "Shelf 1"]
  image_url  text,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT fk_cellars_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create cellar_wines table
CREATE TABLE IF NOT EXISTS public.cellar_wines (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id       uuid         NOT NULL,   -- references cellars.id
  wine_id         uuid         NOT NULL,   -- references wines.id
  purchase_date   date,
  purchase_price  numeric(10,2),
  quantity        integer      NOT NULL DEFAULT 1,
  size            text,
  section         text,
  condition       text,
  status          text         NOT NULL DEFAULT 'in_stock',
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT fk_cellarwines_cellar
    FOREIGN KEY (cellar_id) REFERENCES public.cellars (id) ON DELETE CASCADE,
  CONSTRAINT fk_cellarwines_wine
    FOREIGN KEY (wine_id) REFERENCES public.wines (id) ON DELETE CASCADE
);

-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL,      -- references auth.users.id
  wine_id         uuid         NOT NULL,      -- references wines.id
  cellar_wine_id  uuid,
  tasting_date    date         DEFAULT now(),
  note_text       text         NOT NULL,
  rating_5        float,       -- float for fractional ratings
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT fk_notes_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_wine
    FOREIGN KEY (wine_id) REFERENCES public.wines (id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_cellar_wine
    FOREIGN KEY (cellar_wine_id) REFERENCES public.cellar_wines (id) ON DELETE SET NULL
);

-- Create user_wines table
CREATE TABLE IF NOT EXISTS public.user_wines (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid         NOT NULL,
  wine_id        uuid         NOT NULL,
  wishlist       boolean      NOT NULL DEFAULT false,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_wines_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_wines_wine
    FOREIGN KEY (wine_id) REFERENCES public.wines (id) ON DELETE CASCADE,
  CONSTRAINT user_wines_unique_pair
    UNIQUE (user_id, wine_id)
);

-- Create user_activities table
CREATE TABLE IF NOT EXISTS public.user_activities (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         NOT NULL,
  activity_type   text         NOT NULL,  -- 'scan', 'add_to_cellar', 'consume', 'note', 'wishlist', etc.
  wine_id         uuid,                   -- Optional: specific wine related to this activity
  cellar_id       uuid,                   -- Optional: related cellar if applicable
  cellar_wine_id  uuid,                   -- Optional: related cellar_wine if applicable
  file_url        text,                   -- For scan activities: path to the scanned image
  metadata        jsonb,                  -- Flexible data storage for activity-specific details
  created_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_activities_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_activities_wine
    FOREIGN KEY (wine_id) REFERENCES public.wines (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_activities_cellar
    FOREIGN KEY (cellar_id) REFERENCES public.cellars (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_activities_cellar_wine
    FOREIGN KEY (cellar_wine_id) REFERENCES public.cellar_wines (id) ON DELETE SET NULL
);

-- Create chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid         NOT NULL,
  started_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  context    jsonb,
  CONSTRAINT fk_chat_sessions_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid         NOT NULL,
  sender        text         NOT NULL,   -- "user" or "agent"
  message       text,
  media_url     text,
  sent_at       timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT fk_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES public.chat_sessions (id) ON DELETE CASCADE
);
