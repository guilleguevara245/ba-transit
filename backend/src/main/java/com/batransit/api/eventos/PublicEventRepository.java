package com.batransit.api.eventos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface PublicEventRepository extends JpaRepository<PublicEvent, Long> {

    /** Activos que todavia no terminaron, del mas proximo al mas lejano. */
    @Query("select e from PublicEvent e where e.active = true and (e.endsAt is null or e.endsAt > :now) "
            + "order by e.startsAt")
    List<PublicEvent> findCurrent(@Param("now") Instant now);
}
