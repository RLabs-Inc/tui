/**
 * Test 11: Layout Features
 *
 * Tests min/max constraints, flex-basis, and align-self.
 * These are fundamental flexbox features now implemented in TITAN.
 */

import '../setup'
import { signal, effect } from '@rlabs-inc/signals'
import { box, text, mount } from '../../src'

// Test min/max constraints
box({
  width: '100%',
  height: 20,
  border: 1,
  flexDirection: 'column',
  gap: 1,
  padding: 1,
  children: () => {
    text({ content: 'Min/Max Constraints Test' })

    box({
      flexDirection: 'row',
      gap: 2,
      children: () => {
        // Box with minWidth - won't shrink below 20
        box({
          width: 10, // tries to be 10
          minWidth: 20, // but minimum is 20
          height: 3,
          border: 1,
          children: () => text({ content: 'min:20' })
        })

        // Box with maxWidth - won't grow above 30
        box({
          grow: 1, // tries to grow
          maxWidth: 30, // but maximum is 30
          height: 3,
          border: 1,
          children: () => text({ content: 'max:30' })
        })

        // Normal growing box
        box({
          grow: 1,
          height: 3,
          border: 1,
          children: () => text({ content: 'grows' })
        })
      }
    })

    // Flex-basis test
    text({ content: 'Flex-Basis Test' })

    box({
      flexDirection: 'row',
      gap: 1,
      children: () => {
        // Box with flex-basis 40
        box({
          flexBasis: 40, // base size before grow/shrink
          height: 3,
          border: 1,
          children: () => text({ content: 'basis:40' })
        })

        // Box with flex-basis 20
        box({
          flexBasis: 20,
          grow: 1, // will grow from 20
          height: 3,
          border: 1,
          children: () => text({ content: 'basis:20+grow' })
        })
      }
    })

    // Align-self test
    text({ content: 'Align-Self Test' })

    box({
      flexDirection: 'row',
      height: 5,
      alignItems: 'flex-start', // parent alignment
      gap: 2,
      children: () => {
        box({
          width: 10,
          height: 3,
          border: 1,
          // uses parent's alignItems: flex-start
          children: () => text({ content: 'start' })
        })

        box({
          width: 10,
          height: 3,
          border: 1,
          alignSelf: 'center', // overrides parent
          children: () => text({ content: 'center' })
        })

        box({
          width: 10,
          height: 3,
          border: 1,
          alignSelf: 'flex-end', // overrides parent
          children: () => text({ content: 'end' })
        })
      }
    })
  }
})

mount({ mode: 'fullscreen' })
