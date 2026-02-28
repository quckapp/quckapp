package com.quckapp.promotion;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EnvironmentChainTest {

    @Test
    void nextOf_returnsNextEnvironment() {
        assertEquals("dev", EnvironmentChain.nextOf("local"));
        assertEquals("qa", EnvironmentChain.nextOf("dev"));
        assertEquals("uat", EnvironmentChain.nextOf("qa"));
        assertEquals("staging", EnvironmentChain.nextOf("uat"));
        assertEquals("production", EnvironmentChain.nextOf("staging"));
        assertEquals("live", EnvironmentChain.nextOf("production"));
    }

    @Test
    void nextOf_returnsNullForLastEnvironment() {
        assertNull(EnvironmentChain.nextOf("live"));
    }

    @Test
    void nextOf_normalizesUatVariants() {
        assertEquals("staging", EnvironmentChain.nextOf("uat1"));
        assertEquals("staging", EnvironmentChain.nextOf("uat2"));
        assertEquals("staging", EnvironmentChain.nextOf("uat3"));
    }

    @Test
    void previousOf_returnsPreviousEnvironment() {
        assertNull(EnvironmentChain.previousOf("local"));
        assertEquals("local", EnvironmentChain.previousOf("dev"));
        assertEquals("uat", EnvironmentChain.previousOf("staging"));
        assertEquals("production", EnvironmentChain.previousOf("live"));
    }

    @Test
    void nextOf_returnsNullForUnknownEnvironment() {
        assertNull(EnvironmentChain.nextOf("unknown"));
    }

    @Test
    void nextOf_nullNormalizesToLocal() {
        // normalize(null) returns "local", so nextOf(null) returns "dev"
        assertEquals("dev", EnvironmentChain.nextOf(null));
    }
}
