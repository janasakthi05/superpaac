import React, { useEffect, useRef } from "react"
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native"

const { width, height } = Dimensions.get("window")
const useDriver = Platform.OS !== "web"

type Item = {
  id: string
  size: number
  left: number
  delay: number
  duration: number
  opacity: number
  startScale: number
}

const NUM_BUBBLES = 14

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function createItems(count: number): Item[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `bubble-${i}`,
    size: random(40, 90),
    left: random(0, width - 40),
    delay: random(0, 4000),
    duration: random(7000, 15000),
    opacity: random(0.08, 0.22),
    startScale: 0.7,
  }))
}

export default function AnimatedBackground({ style }: { style?: any }) {
  const bubbles = createItems(NUM_BUBBLES)

  const animsRef = useRef(
    bubbles.reduce((acc, item) => {
      acc[item.id] = {
        pathY: new Animated.Value(height * 0.5),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(item.startScale),
      }
      return acc
    }, {} as Record<string, any>)
  ).current

  useEffect(() => {
    bubbles.forEach((item) => {
      const ref = animsRef[item.id]

      const path = Animated.loop(
        Animated.sequence([
          Animated.timing(ref.pathY, {
            toValue: -300,
            duration: item.duration * 1.5,
            delay: item.delay,
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.pathY, {
            toValue: height * 0.6,
            duration: 0,
            useNativeDriver: useDriver,
          }),
        ])
      )

      const fadeSoft = Animated.loop(
        Animated.sequence([
          Animated.timing(ref.opacity, {
            toValue: item.opacity * 2,
            duration: item.duration * 0.7,
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.opacity, {
            toValue: 0,
            duration: item.duration * 0.8,
            useNativeDriver: useDriver,
          }),
        ])
      )

      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(ref.scale, {
            toValue: 1.4,
            duration: item.duration * 0.7,
            useNativeDriver: useDriver,
          }),
          Animated.timing(ref.scale, {
            toValue: 1,
            duration: item.duration * 0.7,
            useNativeDriver: useDriver,
          }),
        ])
      )

      path.start()
      fadeSoft.start()
      breathe.start()
    })
  }, [])

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {bubbles.map((b) => {
        const anim = animsRef[b.id]
        return (
          <Animated.View
            key={b.id}
            style={[
              styles.bubble,
              {
                width: b.size,
                height: b.size,
                left: b.left,
                borderRadius: b.size / 2,
                opacity: anim.opacity,
                transform: [
                  { translateY: anim.pathY },
                  { scale: anim.scale },
                ],
              },
            ]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.26)",
  },
})
